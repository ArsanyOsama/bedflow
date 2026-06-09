# backend/app/routes/settings.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
from app.database import get_db

router = APIRouter()


class SettingsUpdate(BaseModel):
    bed_price_per_day:   Optional[float] = None
    currency:            Optional[str] = None
    ems_mode:            Optional[Literal["auto", "manual"]] = None
    ems_request_timeout: Optional[int] = None
    surge_threshold:     Optional[int] = None
    enable_ems_alerts:   Optional[bool] = None
    enable_surge_alerts: Optional[bool] = None


@router.get("/{hospital_id}")
def get_settings(hospital_id: str):
    db = get_db()
    res = db.table("hospital_settings").select(
        "*").eq("hospital_id", hospital_id).single().execute()
    if not res.data:
        # Return defaults
        return {
            "hospital_id":        hospital_id,
            "bed_price_per_day":  2000.00,
            "currency":           "EGP",
            "ems_mode":           "manual",
            "ems_request_timeout": 5,
            "surge_threshold":    85,
            "enable_ems_alerts":  True,
            "enable_surge_alerts": True,
        }
    return res.data


@router.patch("/{hospital_id}")
def update_settings(hospital_id: str, payload: SettingsUpdate):
    db = get_db()
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No fields to update")

    # Upsert
    res = db.table("hospital_settings").upsert({
        "hospital_id": hospital_id,
        **update_data,
    }, on_conflict="hospital_id").execute()

    return res.data[0] if res.data else {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# backend/app/routes/reports.py (REPLACEMENT — full analytics with timeline)
# ─────────────────────────────────────────────────────────────────────────────
