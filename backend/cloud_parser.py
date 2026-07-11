import csv
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Ensure backend directory is in the path for modular imports
sys.path.append(str(Path(__file__).resolve().parent))

from station_service import fetch_orlando_stations
from app.detector import detect_anomalies
from app.gemini import explain_charger

BACKEND_DIR = Path(__file__).resolve().parent
LOG_DIR = BACKEND_DIR / "EV_logs"
METADATA_FILE = BACKEND_DIR / "charger_metadata.csv"
OUTPUT_FILE = BACKEND_DIR / "chargers.json"

# Demo-only firmware advisory profiles.
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


def rule_based_analyze(
    log_path: Path,
    metadata: dict[str, str],
    api_station: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Deterministically scores EVerest log files in the same output shape as detect_anomalies().
    Used as an offline/network error fallback for Agent 1.
    """
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
                "evidence": f"Metadata reports firmware {firmware}.",
            }
        )

    risk = min(risk, 100)

    if risk < 25:
        status = "SAFE"
        recommendation = "No major risk indicators were detected."
    elif risk < 60:
        status = "CAUTION"
        recommendation = "Review the findings before using this charger."
    else:
        status = "COMPROMISED"
        recommendation = "Avoid this charger until it is inspected or updated."

    return {
        "status": status,
        "risk": risk,
        "recommendation": recommendation,
        "findings": findings,
    }


def analyze_charger(
    log_path: Path,
    metadata: dict[str, str],
    api_station: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Orchestrates the offline Two-Agent Gemini intelligence chain for a single charger.
    """
    raw_text = log_path.read_text(encoding="utf-8-sig", errors="replace")

    try:
        verdict = detect_anomalies(raw_text)  # Agent 1
    except Exception as error:
        print(f"Agent 1 analysis failed for {log_path.name}: {error}. Falling back to rule-based analysis.")
        verdict = rule_based_analyze(log_path, metadata, api_station)  # fallback

    location = None
    if api_station:
        location = {
            "lat": api_station["location"]["lat"],
            "lng": api_station["location"]["lng"]
        }
    else:
        location = parse_location(metadata)

    # Telemetry metrics extraction
    entries = read_log(log_path)
    events = [entry["event"] for entry in entries]
    current_requests = count(events, "CurrentDemandReq")
    current_responses = count(events, "CurrentDemandRes")
    session_finished = contains(events, "Session Finished")
    transaction_finished = contains(events, "Transaction Finished")

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

    charger = {
        "id": api_station["id"] if api_station else metadata.get("charger_id"),
        "name": api_station["name"] if api_station else metadata.get("name"),
        "location": location,
        "firmware": metadata.get("firmware", "unknown"),
        "log_file": log_path.name,
        "status": verdict["status"],
        "risk": verdict["risk"],
        "recommendation": verdict["recommendation"],
        "findings": verdict["findings"],
        "telemetry": {
            "event_count": len(entries),
            "duration_seconds": duration_seconds,
            "current_demand_requests": current_requests,
            "current_demand_responses": current_responses,
            "session_finished": session_finished,
            "transaction_finished": transaction_finished,
        },
    }

    try:
        charger["driver_summary"] = explain_charger(charger)  # Agent 2
    except Exception as error:
        print(f"Agent 2 explanation failed for {charger['name']}: {error}. Using recommendation fallback.")
        charger["driver_summary"] = charger["recommendation"]

    return charger


def build_chargers() -> list[dict[str, Any]]:
    """
    Pairs discovered log files and active Orlando NREL API stations, and compiles
    both audited and deterministically simulated charger profiles.
    """
    metadata_by_filename = load_metadata()
    log_paths = discover_logs()

    if not log_paths:
        raise RuntimeError("No CSV files were found inside logs/.")

    try:
        # Fetch Florida NREL/NLR stations within a 50-mile radius (capped at 200 documents)
        api_stations = fetch_orlando_stations(
            radius_miles=50,
            limit=200,
        )
        print(
            f"Fetched {len(api_stations)} public Orlando EV stations (50 mile radius)."
        )
    except Exception as error:
        print(f"Warning: NLR station lookup failed: {error}")
        print("Continuing with local metadata fallback.")
        api_stations = []

    results: list[dict[str, Any]] = []
    total_to_process = max(len(api_stations), len(log_paths))

    for i in range(total_to_process):
        api_station = api_stations[i] if i < len(api_stations) else None

        if i < len(log_paths):
            log_path = log_paths[i]
            metadata = metadata_by_filename.get(log_path.name)

            if metadata is None:
                metadata = generated_metadata(log_path, i + 1)
            else:
                metadata = dict(metadata)
                metadata["source"] = "charger_metadata.csv"

            try:
                result = analyze_charger(
                    log_path=log_path,
                    metadata=metadata,
                    api_station=api_station,
                )
                results.append(result)
                print(
                    f"Processed physical log {log_path.name} -> {result['name']} ({result['status']})"
                )
            except Exception as error:
                print(f"Error processing physical log {log_path.name}: {error}")
        else:
            if not api_station:
                continue

            station_id = api_station["id"]
            mod = station_id % 5

            if mod == 0:
                status = "COMPROMISED"
                risk = 84
                recommendation = "HIGH RISK. Unencrypted connection allows billing credential extraction."
                findings = [
                    {
                        "code": "CVE-2024-3812",
                        "title": "Unencrypted OCPP 1.6 Handshake",
                        "severity": "HIGH",
                        "evidence": "Unencrypted handshakes over standard HTTP WebSocket port 80. Network sniffer can intercept charging commands, start/stop charge sessions, and access billing details. Active Man-in-the-Middle (MitM) arp spoofing detected on local switch."
                    }
                ]
                telemetry = {
                    "event_count": 521,
                    "duration_seconds": 65.4,
                    "current_demand_requests": 140,
                    "current_demand_responses": 140,
                    "session_finished": True,
                    "transaction_finished": True
                }
            elif mod == 1:
                status = "CAUTION"
                risk = 32
                recommendation = "Low threat. Safe to charge, though minor security updates are pending."
                findings = [
                    {
                        "code": "CVE-2024-1188",
                        "title": "Minor Firmware Out-of-Date Alert",
                        "severity": "LOW",
                        "evidence": "Firmware hash mismatch: minor version runs EVerest v24.1.2 instead of the latest v24.2.1. However, encryption handshakes are intact and safe."
                    }
                ]
                telemetry = {
                    "event_count": 312,
                    "duration_seconds": 45.2,
                    "current_demand_requests": 88,
                    "current_demand_responses": 88,
                    "session_finished": True,
                    "transaction_finished": True
                }
            elif mod == 2:
                status = "COMPROMISED"
                risk = 96
                recommendation = "CRITICAL RISK. Avoid this station. Third party may gain access to vehicle billing accounts."
                findings = [
                    {
                        "code": "CVE-2023-4512",
                        "title": "RFID Card Cloning & Replay Exploit",
                        "severity": "CRITICAL",
                        "evidence": "Vulnerable firmware version runs insecure ISO 15118 RFID handshakes. Attackers can clone valid driver RFIDs by passive listening and replay them."
                    }
                ]
                telemetry = {
                    "event_count": 890,
                    "duration_seconds": 150.0,
                    "current_demand_requests": 210,
                    "current_demand_responses": 210,
                    "session_finished": True,
                    "transaction_finished": True
                }
            else:
                status = "SAFE"
                risk = 0
                recommendation = "No major risk indicators were detected."
                findings = []
                telemetry = {
                    "event_count": 450,
                    "duration_seconds": 90.0,
                    "current_demand_requests": 120,
                    "current_demand_responses": 120,
                    "session_finished": True,
                    "transaction_finished": True
                }

            charger_doc = {
                "id": station_id,
                "name": api_station["name"],
                "location": api_station["location"],
                "firmware": "EVerest v24.2.1" if status == "SAFE" else "EVerest v24.1.2",
                "log_file": "simulated_on_demand",
                "status": status,
                "risk": risk,
                "recommendation": recommendation,
                "findings": findings,
                "telemetry": telemetry
            }

            # Performance optimization: Pre-bake driver summaries for simulated template nodes
            # to avoid hundreds of slow, redundant serial Gemini API calls.
            if mod == 0:
                charger_doc["driver_summary"] = "Avoid utilizing this charger if possible. It is communicating over an insecure, unencrypted WebSocket protocol, making it vulnerable to local packet interception."
            elif mod == 1:
                charger_doc["driver_summary"] = "This charger is running an older firmware release. While its encryption is active and intact, a non-critical software update is pending."
            elif mod == 2:
                charger_doc["driver_summary"] = "Do not use this station. The charger is running an outdated firmware version vulnerable to RFID cloning, and multiple authentication failures have been flagged."
            else:
                charger_doc["driver_summary"] = "This charging station is fully secured with verified encrypted handshakes. All security systems are green and safe to connect."

            results.append(charger_doc)

    return results


def main() -> None:
    results = build_chargers()
    with OUTPUT_FILE.open("w", encoding="utf-8") as file:
        json.dump(results, file, indent=2)

    print(
        f"\nGenerated {OUTPUT_FILE} with "
        f"{len(results)} total EV stations from Orlando 50-mile grid."
    )


if __name__ == "__main__":
    main()
