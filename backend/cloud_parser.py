import csv
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure backend directory is in the path for modular imports
sys.path.append(str(Path(__file__).resolve().parent))

from station_service import fetch_orlando_stations, fetch_station_by_id
from app.detector import detect_anomalies
from app.gemini import explain_charger

BACKEND_DIR = Path(__file__).resolve().parent
LOG_DIR = BACKEND_DIR / "EV_logs"
METADATA_FILE = BACKEND_DIR / "charger_metadata.csv"
STATION_MAPPING_FILE = BACKEND_DIR / "charger_station_map.csv"
OUTPUT_FILE = BACKEND_DIR / "chargers.json"

# Demo-only firmware advisory profiles.
FIRMWARE_PROFILES: Dict[str, Dict[str, Any]] = {
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


def parse_timestamp(value: str) -> Optional[datetime]:
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


def read_log(log_path: Path) -> List[Dict[str, str]]:
    delimiter = detect_delimiter(log_path)
    entries: List[Dict[str, str]] = []

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


def load_metadata() -> Dict[str, Dict[str, str]]:
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


def load_station_mapping() -> Dict[str, str]:
    """
    Read explicit static station mappings between CSV filenames and NLR station IDs.
    """
    if not STATION_MAPPING_FILE.exists():
        print(
            f"Warning: Station mapping file not found: {STATION_MAPPING_FILE}. "
            "No explicit log-to-station mappings will be applied."
        )
        return {}

    with STATION_MAPPING_FILE.open(
        "r",
        newline="",
        encoding="utf-8-sig",
    ) as file:
        reader = csv.DictReader(file)
        fieldnames = {name.strip() for name in (reader.fieldnames or []) if name}

        required_columns = {"log_file", "nlr_station_id"}
        missing = required_columns - fieldnames
        if missing:
            raise ValueError(
                "Station mapping file missing required columns: "
                + ", ".join(sorted(missing))
            )

        mapping: Dict[str, str] = {}
        for row_number, row in enumerate(reader, start=2):
            log_file = row.get("log_file", "").strip()
            station_id = row.get("nlr_station_id", "").strip()

            if not log_file or not station_id:
                print(
                    f"Warning: Ignoring incomplete mapping row {row_number} "
                    f"in {STATION_MAPPING_FILE}."
                )
                continue

            if log_file in mapping:
                raise ValueError(
                    f"Duplicate log_file entry in station mapping file: {log_file}"
                )

            mapping[log_file] = station_id

    return mapping


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


def generated_metadata(log_path: Path, index: int) -> Dict[str, str]:
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


def contains(events: List[str], phrase: str) -> bool:
    phrase = phrase.lower()
    return any(phrase in event.lower() for event in events)


def count(events: List[str], phrase: str) -> int:
    phrase = phrase.lower()
    return sum(phrase in event.lower() for event in events)


def first_index(events: List[str], phrase: str) -> Optional[int]:
    phrase = phrase.lower()

    for index, event in enumerate(events):
        if phrase in event.lower():
            return index

    return None


def parse_location(metadata: Dict[str, str]) -> Optional[Dict[str, float]]:
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
    metadata: Dict[str, str],
    api_station: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Deterministically scores EVerest log files in the same output shape as detect_anomalies().
    Used as an offline/network error fallback for Agent 1.
    """
    entries = read_log(log_path)
    events = [entry["event"] for entry in entries]

    findings: List[Dict[str, Any]] = []
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
    metadata: Dict[str, str],
    api_station: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
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


def build_chargers() -> List[Dict[str, Any]]:
    """
    Pairs discovered log files with explicit NLR station mappings and active
    Orlando NLR API stations, then compiles audited charger profiles.
    """
    metadata_by_filename = load_metadata()
    station_mapping = load_station_mapping()
    log_paths = discover_logs()

    if not log_paths:
        raise RuntimeError("No CSV files were found inside logs/.")

    station_id_to_logs: Dict[str, List[str]] = {}
    for log_file, station_id in station_mapping.items():
        station_id_to_logs.setdefault(station_id, []).append(log_file)

    for station_id, files in station_id_to_logs.items():
        if len(files) > 1:
            print(
                f"Warning: Station ID {station_id} is mapped from multiple log files: "
                f"{', '.join(files)}"
            )

    try:
        # Fetch Florida NRL/NLR stations within a 50-mile radius (capped at 200 documents)
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

    mapped_station_ids = {station_id for station_id in station_mapping.values()}
    direct_station_cache: Dict[str, Dict[str, Any]] = {}
    for station_id in sorted(mapped_station_ids, key=str):
        try:
            station = fetch_station_by_id(station_id)
            direct_station_cache[str(station["id"])] = station
        except Exception as error:
            print(
                f"Warning: Direct lookup for station ID {station_id} failed: {error}. "
                "Falling back to local metadata."
            )

    stations_by_id = {
        str(station["id"]): station
        for station in api_stations
    }
    stations_by_id.update(direct_station_cache)

    results: List[Dict[str, Any]] = []
    processed_station_ids: set[str] = set()

    for index, log_path in enumerate(log_paths, start=1):
        metadata = metadata_by_filename.get(log_path.name)

        if metadata is None:
            metadata = generated_metadata(log_path, index)
        else:
            metadata = dict(metadata)
            metadata["source"] = "charger_metadata.csv"

        api_station = None
        station_id = station_mapping.get(log_path.name)
        if station_id:
            api_station = stations_by_id.get(station_id)
            if api_station is None:
                print(
                    f"Warning: Mapped station ID {station_id} for log "
                    f"{log_path.name} was not found in NLR lookup results. "
                    "Using local metadata fallback."
                )
            else:
                processed_station_ids.add(str(api_station["id"]))
        else:
            print(
                f"Warning: No station mapping for log {log_path.name}. "
                "Using local metadata fallback."
            )

        try:
            result = analyze_charger(
                log_path=log_path,
                metadata=metadata,
                api_station=api_station,
            )
            results.append(result)
            print(
                f"Processed physical log {log_path.name} -> {result['name']} "
                f"({result['status']})"
            )
        except Exception as error:
            print(f"Error processing physical log {log_path.name}: {error}")

    for api_station in api_stations:
        station_id = str(api_station["id"])
        if station_id in processed_station_ids:
            continue

        results.append(
            {
                "id": api_station["id"],
                "name": api_station["name"],
                "location": api_station["location"],
                "firmware": "unknown",
                "log_file": None,
                "status": "UNSCANNED",
                "risk": None,
                "recommendation": (
                    "No EVerest CSV log is mapped to this station, so it has "
                    "not been analyzed."
                ),
                "findings": [],
                "telemetry": {
                    "event_count": 0,
                    "duration_seconds": None,
                    "current_demand_requests": 0,
                    "current_demand_responses": 0,
                    "session_finished": False,
                    "transaction_finished": False,
                },
            }
        )

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
