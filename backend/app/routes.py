from fastapi import APIRouter, HTTPException
from app.gemini import explain_charger
from app.data import load_chargers, get_charger

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/chargers")
def chargers():
    return load_chargers()


@router.get("/chargers/{charger_id}")
def charger(charger_id: int):

    charger = get_charger(charger_id)

    if charger is None:
        raise HTTPException(
            status_code=404,
            detail="Charger not found"
        )

    return charger

@router.get("/chargers/{charger_id}/explanation")
def charger_explanation(charger_id: int):

    charger = get_charger(charger_id)

    if charger is None:
        raise HTTPException(
            status_code=404,
            detail="Charger not found"
        )

    return {
        **charger,
        "Risk Assessment": explain_charger(charger)
    }