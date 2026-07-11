import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

# Secret Manager configuration.
# Store the NLR API key as a secret named "nlr-api-key".
SECRET_ID = "nlr-api-key"
LOCAL_KEY_FILE = Path("nlr_api_key.txt")

NLR_ENDPOINT = (
    "https://developer.nlr.gov/"
    "api/alt-fuel-stations/v1/nearest.json"
)
NLR_STATION_ENDPOINT = (
    "https://developer.nlr.gov/"
    "api/alt-fuel-stations/v1"
)

ORLANDO_LATITUDE = 28.6024
ORLANDO_LONGITUDE = -81.2001


def get_nlr_api_key() -> str:
    """
    Retrieve the NLR API key without requiring an environment variable.

    Cloud:
        Uses Application Default Credentials to identify the current
        Google Cloud project, then reads Secret Manager secret nlr-api-key.

    Local:
        Falls back to nlr_api_key.txt if Secret Manager is unavailable.
        This file must never be committed.
    """
    import os
    try:
        from dotenv import load_dotenv
        # load from root .env if it exists
        root_env = Path(__file__).resolve().parent.parent / ".env"
        if root_env.exists():
            load_dotenv(dotenv_path=root_env)
        else:
            load_dotenv()
    except ImportError:
        pass

    env_key = os.environ.get("NREL_API_KEY") or os.environ.get("NLR_API_KEY")
    if env_key:
        return env_key.strip()

    cloud_error: Optional[Exception] = None

    try:
        import google.auth
        from google.cloud import secretmanager

        _, project_id = google.auth.default()

        if not project_id:
            raise RuntimeError(
                "Google Cloud project ID could not be determined."
            )

        client = secretmanager.SecretManagerServiceClient()
        secret_name = (
            f"projects/{project_id}/secrets/{SECRET_ID}/versions/latest"
        )
        response = client.access_secret_version(
            request={"name": secret_name}
        )
        key = response.payload.data.decode("utf-8").strip()

        if not key:
            raise RuntimeError("The Secret Manager value is empty.")

        return key

    except Exception as error:
        cloud_error = error

    if LOCAL_KEY_FILE.exists():
        key = LOCAL_KEY_FILE.read_text(encoding="utf-8").strip()

        if key:
            return key

    raise RuntimeError(
        "NLR API key was not available. In Google Cloud, create a "
        f"Secret Manager secret named '{SECRET_ID}' and grant the runtime "
        "service account Secret Manager Secret Accessor. For local "
        f"development, create {LOCAL_KEY_FILE} containing only the key. "
        f"Secret Manager error: {cloud_error}"
    )


def fetch_orlando_stations(
    radius_miles: float = 30,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    """
    Fetch public, operational EV stations near Orlando.

    Returned objects deliberately match the parser's existing fields:
        id
        name
        location
    """
    if radius_miles <= 0 or radius_miles > 500:
        raise ValueError("radius_miles must be between 0 and 500.")

    if limit <= 0:
        raise ValueError("limit must be greater than zero.")

    api_key = get_nlr_api_key()

    params = {
        "api_key": api_key,
        "latitude": ORLANDO_LATITUDE,
        "longitude": ORLANDO_LONGITUDE,
        "radius": radius_miles,
        "fuel_type": "ELEC",
        "access": "public",
        "status": "E",
        "limit": min(limit, 200),
    }

    request = Request(
        f"{NLR_ENDPOINT}?{urlencode(params)}",
        headers={
            "Accept": "application/json",
            "User-Agent": "EcoShield-SecureRoute/1.0",
        },
    )

    try:
        with urlopen(request, timeout=30) as response:
            payload = json.load(response)
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"NLR API returned HTTP {error.code}: {details}"
        ) from error
    except URLError as error:
        raise RuntimeError(
            f"Could not connect to the NLR API: {error.reason}"
        ) from error

    stations: List[Dict[str, Any]] = []

    for station in payload.get("fuel_stations", []):
        station_id = station.get("id")
        latitude = station.get("latitude")
        longitude = station.get("longitude")

        if station_id is None or latitude is None or longitude is None:
            continue

        stations.append(
            {
                "id": station_id,
                "name": station.get(
                    "station_name",
                    f"Orlando Charger {station_id}",
                ),
                "location": {
                    "lat": float(latitude),
                    "lng": float(longitude),
                },
            }
        )

    # Stable ordering keeps CSV-to-station assignment deterministic.
    return sorted(stations, key=lambda station: station["id"])


def fetch_station_by_id(station_id: str or int) -> Dict[str, Any]:
    """
    Fetch an individual NLR station by its numeric ID.
    """
    if station_id is None or str(station_id).strip() == "":
        raise ValueError("station_id must be a non-empty string or integer.")

    api_key = get_nlr_api_key()
    request = Request(
        f"{NLR_STATION_ENDPOINT}/{station_id}.json?{urlencode({'api_key': api_key})}",
        headers={
            "Accept": "application/json",
            "User-Agent": "EcoShield-SecureRoute/1.0",
        },
    )

    try:
        with urlopen(request, timeout=30) as response:
            payload = json.load(response)
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"NLR station lookup returned HTTP {error.code}: {details}"
        ) from error
    except URLError as error:
        raise RuntimeError(
            f"Could not connect to the NLR API: {error.reason}"
        ) from error

    station = payload.get("fuel_stations")
    if not station or not isinstance(station, list):
        raise RuntimeError("NLR station lookup returned an unexpected payload.")

    station = station[0]
    station_id_value = station.get("id")
    latitude = station.get("latitude")
    longitude = station.get("longitude")

    if station_id_value is None:
        raise RuntimeError("NLR station lookup response missing station ID.")
    if latitude is None or longitude is None:
        raise RuntimeError(
            f"NLR station lookup response for ID {station_id} is missing coordinates."
        )

    return {
        "id": station_id_value,
        "name": station.get("station_name", f"Station {station_id_value}"),
        "location": {
            "lat": float(latitude),
            "lng": float(longitude),
        },
    }
