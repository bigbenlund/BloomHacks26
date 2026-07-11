import json
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent / "chargers.json"


def load_chargers():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def get_charger(charger_id: int):
    chargers = load_chargers()

    for charger in chargers:
        if charger["id"] == charger_id:
            return charger

    return None