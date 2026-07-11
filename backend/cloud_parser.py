import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from station_service import fetch_orlando_stations

LOG_DIR = Path("EV_logs")
METADATA_FILE = Path("charger_metadata.csv")
OUTPUT_FILE = Path("chargers.json")

# Demo-only firmware advisory profiles.
# Replace with a verified advisory source before making factual CVE claims.
FIRMWARE_PROFILES: dict[str, dict[str, Any]] = {
    "1.2.0": {
        "advisory_id": "DEMO-ADV-001",
        "severity": "HIGH",
        "risk_points": 35,
        "description": "Simulated outdated firmware profile with RFID replay exposure.",
    },
    "1.3.1": {
        "advisory_id": "DEMO-ADV-002",
        "severity": "MEDIUM",
        "risk_points": 20,
        "description": "Simulated insecure-handshake firmware profile.",
    },
}


def slug_from_filename(filename: str) -> str:
    return Path(filename).stem.replace("_", "-").replace(" ", "-").lower()


def parse_timestamp(value: str) -> datetime | None:
    value = value.strip()
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def detect_delimiter(path: Path) -> str:
    sample = path.read_text(encoding="utf-8-sig", errors="replace")[:4096]

    try:
        return csv.Sniffer().sniff(sample, delimiters=",\t;").delimiter
    except csv.Error:
        return "\t" if "\t" in sample else ","


def read_log(log_path: Path) -> list[dict[str, str]]:
    delimiter = detect_delimiter(log_path)
    entries: list[dict[str, str]] = []

    with log_path.open(
        "r",
        newline="",
        encoding="utf-8-sig",
        errors="replace",
    ) as file:
        reader = csv.reader(file, delimiter=delimiter)

        for row in reader:
            if len(row) < 3:
                continue

            entries.append(
                {
                    "timestamp": row[0].strip(),
                    "source": row[1].strip(),
                    "event": row[2].strip(),
                    "details": row[3].strip() if len(row) > 3 else "",
                }
            )

    return entries


def load_metadata() -> dict[str, dict[str, str]]:
    """
    Returns metadata indexed by log filename.

    Metadata is optional. Any CSV log without a metadata row still gets
    analyzed using generated defaults.
    """
    if not METADATA_FILE.exists():
        return {}

    with METADATA_FILE.open(
        "r",
        newline="",
        encoding="utf-8-sig",
    ) as file:
        rows = list(csv.DictReader(file))

    return {
        row["log_file"].strip(): row
        for row in rows
        if row.get("log_file", "").strip()
    }


def discover_logs() -> list[Path]:
    """
    Finds every CSV file inside logs/, including nested folders.
    """
    if not LOG_DIR.exists():
        raise FileNotFoundError(f"Missing log directory: {LOG_DIR}")

    return sorted(
        path
        for path in LOG_DIR.rglob("*.csv")
        if path.is_file()
    )


def generated_metadata(log_path: Path, index: int) -> dict[str, str]:
    """
    Creates fallback metadata for logs not listed in charger_metadata.csv.
    """
    stem = log_path.stem.replace("_", " ").replace("-", " ").title()

    return {
        "charger_id": slug_from_filename(log_path.name),
        "name": stem,
        "log_file": log_path.name,
        "firmware": "unknown",
        "lat": "",
        "lng": "",
        "source": "generated",
        "display_order": str(index),
    }


def contains(events: list[str], phrase: str) -> bool:
    phrase = phrase.lower()
    return any(phrase in event.lower() for event in events)


def count(events: list[str], phrase: str) -> int:
    phrase = phrase.lower()
    return sum(phrase in event.lower() for event in events)


def first_index(events: list[str], phrase: str) -> int | None:
    phrase = phrase.lower()

    for index, event in enumerate(events):
        if phrase in event.lower():
            return index

    return None


def parse_location(metadata: dict[str, str]) -> dict[str, float] | None:
    lat = metadata.get("lat", "").strip()
    lng = metadata.get("lng", "").strip()

    if not lat or not lng:
        return None

    try:
        return {"lat": float(lat), "lng": float(lng)}
    except ValueError:
        return None


def analyze_charger(
    log_path: Path,
    metadata: dict[str, str],
    api_station: dict[str, Any] | None = None,
) -> dict[str, Any]:
    entries = read_log(log_path)
    events = [entry["event"] for entry in entries]

    findings: list[dict[str, Any]] = []
    risk = 0

    def add_finding(
        code: str,
        title: str,
        severity: str,
        points: int,
        evidence: str,
    ) -> None:
        nonlocal risk
        risk += points
        findings.append(
            {
                "code": code,
                "title": title,
                "severity": severity,
                "risk_points": points,
                "evidence": evidence,
            }
        )

    if not contains(events, "Session Started"):
        add_finding(
            "SESSION_START_MISSING",
            "Session start was not recorded",
            "HIGH",
            25,
            "No event containing 'Session Started' was found.",
        )

    if not contains(events, "EIM Authorization received"):
        add_finding(
            "AUTHORIZATION_MISSING",
            "External authorization was not confirmed",
            "CRITICAL",
            40,
            "No 'EIM Authorization received' event was found.",
        )

    if not contains(events, "SLAC MATCHED"):
        add_finding(
            "SLAC_MISSING",
            "PLC pairing was not established",
            "HIGH",
            30,
            "No 'SLAC MATCHED' event was found.",
        )

    required_pairs = [
        ("SessionSetupReq", "SessionSetupRes", "ISO 15118 session setup"),
        ("ServiceDiscoveryReq", "ServiceDiscoveryRes", "service discovery"),
        (
            "ChargeParameterDiscoveryReq",
            "ChargeParameterDiscoveryRes",
            "charge-parameter discovery",
        ),
        ("PowerDeliveryReq", "PowerDeliveryRes", "power delivery"),
    ]

    for request, response, label in required_pairs:
        request_count = count(events, request)
        response_count = count(events, response)

        if request_count == 0 or response_count == 0:
            add_finding(
                f"{request.upper()}_PAIR_MISSING",
                f"Incomplete {label} exchange",
                "MEDIUM",
                15,
                f"Found {request_count} requests and {response_count} responses.",
            )
        elif response_count < request_count:
            add_finding(
                f"{request.upper()}_RESPONSE_GAP",
                f"Some {label} requests were unanswered",
                "HIGH",
                20,
                f"Found {request_count} requests and {response_count} responses.",
            )

    auth_index = first_index(events, "EIM Authorization received")
    power_index = first_index(events, "PowerDeliveryReq")

    if auth_index is not None and power_index is not None and power_index < auth_index:
        add_finding(
            "POWER_BEFORE_AUTH",
            "Power delivery was requested before authorization",
            "CRITICAL",
            60,
            "PowerDeliveryReq appears before authorization.",
        )

    current_requests = count(events, "CurrentDemandReq")
    current_responses = count(events, "CurrentDemandRes")

    if current_requests:
        response_ratio = current_responses / current_requests

        if response_ratio < 0.90:
            add_finding(
                "CURRENT_DEMAND_RESPONSE_GAP",
                "Many current-demand requests were unanswered",
                "HIGH",
                30,
                f"{current_requests} requests and {current_responses} responses.",
            )
        elif current_responses < current_requests:
            add_finding(
                "CURRENT_DEMAND_MINOR_GAP",
                "The final current-demand request may be incomplete",
                "LOW",
                5,
                f"{current_requests} requests and {current_responses} responses.",
            )

    error_terms = [
        "failed",
        "failure",
        "timeout",
        "protocol error",
        "invalid certificate",
        "unauthorized",
        "aborted",
        "emergency stop",
    ]

    matched_terms = [term for term in error_terms if contains(events, term)]

    if matched_terms:
        points = min(10 * len(matched_terms), 30)
        add_finding(
            "ERROR_KEYWORDS",
            "Error indicators were found in the session log",
            "HIGH" if points >= 20 else "MEDIUM",
            points,
            "Matched terms: " + ", ".join(matched_terms),
        )

    session_finished = contains(events, "Session Finished")
    logging_stopped = contains(events, "Session logging stopped")
    transaction_started = contains(events, "Transaction Started")
    transaction_finished = contains(events, "Transaction Finished")

    if not session_finished or not logging_stopped:
        add_finding(
            "INCOMPLETE_SESSION_LOG",
            "The log ends without a complete session shutdown",
            "MEDIUM",
            20,
            (
                f"Session Finished={session_finished}; "
                f"Session logging stopped={logging_stopped}."
            ),
        )

    if transaction_started and not transaction_finished:
        add_finding(
            "TRANSACTION_END_MISSING",
            "The transaction has no recorded completion event",
            "MEDIUM",
            15,
            "Transaction Started exists, but Transaction Finished does not.",
        )

    firmware = metadata.get("firmware", "unknown").strip() or "unknown"
    profile = FIRMWARE_PROFILES.get(firmware)

    if profile:
        risk += int(profile["risk_points"])
        findings.append(
            {
                "code": "FIRMWARE_ADVISORY",
                "title": profile["description"],
                "severity": profile["severity"],
                "risk_points": profile["risk_points"],
                "evidence": f"Metadata reports firmware {firmware}.",
                "advisory_id": profile["advisory_id"],
                "demo_only": True,
            }
        )

    timestamps = [
        timestamp
        for entry in entries
        if (timestamp := parse_timestamp(entry["timestamp"])) is not None
    ]

    duration_seconds = None
    if len(timestamps) >= 2:
        duration_seconds = round(
            (timestamps[-1] - timestamps[0]).total_seconds(),
            3,
        )

    risk = min(risk, 100)

    if risk <= 20:
        status = "SAFE"
        recommendation = "No major risk indicators were detected."
    elif risk <= 50:
        status = "WARNING"
        recommendation = "Review the findings before using this charger."
    else:
        status = "COMPROMISED"
        recommendation = "Avoid this charger until it is inspected or updated."

    return {
        "id": (
            api_station["id"]
            if api_station
            else metadata.get("charger_id")
            or slug_from_filename(log_path.name)
        ),
        "name": (
            api_station["name"]
            if api_station
            else metadata.get("name")
            or log_path.stem
        ),
        "location": (
            api_station["location"]
            if api_station
            else parse_location(metadata)
        ),
        "firmware": firmware,
        "log_file": str(log_path.relative_to(LOG_DIR)),
        "metadata_source": metadata.get("source", "charger_metadata.csv"),
        "status": status,
        "risk": risk,
        "recommendation": recommendation,
        "findings": findings,
        "telemetry": {
            "event_count": len(entries),
            "duration_seconds": duration_seconds,
            "current_demand_requests": current_requests,
            "current_demand_responses": current_responses,
            "session_finished": session_finished,
            "transaction_finished": transaction_finished,
        },
    }


def main() -> None:
    metadata_by_filename = load_metadata()
    log_paths = discover_logs()

    if not log_paths:
        raise RuntimeError("No CSV files were found inside logs/.")

    try:
        api_stations = fetch_orlando_stations(
            radius_miles=30,
            limit=200,
        )
        print(
            f"Fetched {len(api_stations)} public Orlando EV stations."
        )
    except Exception as error:
        # The parser still works if the external service is unavailable.
        print(f"Warning: NLR station lookup failed: {error}")
        print("Continuing with local metadata.")
        api_stations = []

    results: list[dict[str, Any]] = []

    for index, log_path in enumerate(log_paths, start=1):
        metadata = metadata_by_filename.get(log_path.name)

        if metadata is None:
            metadata = generated_metadata(log_path, index)
        else:
            metadata = dict(metadata)
            metadata["source"] = "charger_metadata.csv"

        api_station = (
            api_stations[index - 1]
            if index - 1 < len(api_stations)
            else None
        )

        try:
            result = analyze_charger(
                log_path=log_path,
                metadata=metadata,
                api_station=api_station,
            )
            results.append(result)
            print(
                f"{result['id']}: {result['name']} — "
                f"{result['status']} (risk {result['risk']})"
            )

        except Exception as error:
            results.append(
                {
                    "id": (
                        api_station["id"]
                        if api_station
                        else metadata.get(
                            "charger_id",
                            slug_from_filename(log_path.name),
                        )
                    ),
                    "name": (
                        api_station["name"]
                        if api_station
                        else metadata.get("name", log_path.stem)
                    ),
                    "location": (
                        api_station["location"]
                        if api_station
                        else parse_location(metadata)
                    ),
                    "firmware": metadata.get("firmware", "unknown"),
                    "log_file": str(log_path.relative_to(LOG_DIR)),
                    "status": "UNKNOWN",
                    "risk": None,
                    "recommendation": "The log could not be analyzed.",
                    "findings": [
                        {
                            "code": "ANALYSIS_ERROR",
                            "title": str(error),
                            "severity": "UNKNOWN",
                            "risk_points": 0,
                        }
                    ],
                }
            )
            print(f"{log_path.name}: ERROR - {error}")

    with OUTPUT_FILE.open("w", encoding="utf-8") as file:
        json.dump(results, file, indent=2)

    print(
        f"\nGenerated {OUTPUT_FILE} from "
        f"{len(log_paths)} CSV logs."
    )

if __name__ == "__main__":
    main()
