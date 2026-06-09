from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.database import get_db

router = APIRouter()

BedStatus = Literal["available", "occupied",
                    "cleaning", "maintenance", "reserved"]


class BedStatusUpdate(BaseModel):
    status: BedStatus


@router.get("/ward/{ward_id}")
def get_ward_beds(ward_id: str):
    db = get_db()
    result = db.table("beds") \
        .select("*") \
        .eq("ward_id", ward_id) \
        .order("bed_number") \
        .execute()
    return {"beds": result.data}


@router.patch("/{bed_id}/status")
def update_bed_status(bed_id: str, payload: BedStatusUpdate):
    db = get_db()
    result = db.table("beds") \
        .update({"current_status": payload.status}) \
        .eq("id", bed_id) \
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Bed not found")
    return {"success": True, "bed": result.data[0]}


@router.get("/{bed_id}/history")
def get_bed_history(bed_id: str, limit: int = 10):
    db = get_db()
    result = db.table("bed_status_logs") \
        .select("*") \
        .eq("bed_id", bed_id) \
        .order("changed_at", desc=True) \
        .limit(limit) \
        .execute()
    return {"history": result.data}
