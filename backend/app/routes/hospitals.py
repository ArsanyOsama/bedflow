from fastapi import APIRouter
from app.database import get_db

router = APIRouter()


@router.get("/")
def list_hospitals():
    db = get_db()
    result = db.table("hospitals").select("*").eq("active", True).execute()
    return {"hospitals": result.data}


@router.get("/city-summary")
def get_city_summary():
    """
    Returns aggregate bed availability for all connected hospitals.
    Used by: city map, EMS API, NHIA data feed.
    At MVP scale (0-10 hospitals): queried directly from PostgreSQL view.
    At Phase 2 scale (10+ hospitals): add Upstash Redis caching here.
    """
    db = get_db()
    result = db.table("hospital_bed_summary").select("*").execute()
    return {"hospitals": result.data, "count": len(result.data)}


@router.get("/{hospital_id}/wards")
def get_hospital_wards(hospital_id: str):
    db = get_db()
    result = db.table("wards") \
        .select("*, beds(id, bed_number, current_status)") \
        .eq("hospital_id", hospital_id) \
        .eq("active", True) \
        .execute()
    return {"wards": result.data}
