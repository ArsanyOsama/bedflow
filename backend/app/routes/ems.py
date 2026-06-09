from fastapi import APIRouter, Depends
from app.database import get_db
from typing import Optional
from app.dependencies import verify_ems_key

router = APIRouter()


@router.get("/dispatch/available-beds")
def get_available_beds(
    # Change str = None to Optional[str] = None
    specialty: Optional[str] = None,
    governorate: str = "Cairo",
    _key=Depends(verify_ems_key)
):
    """
    EMS endpoint: which hospitals have available beds right now?
    Requires X-API-Key header.
    Response time: < 200ms at MVP scale. Add Redis cache at Phase 2 scale.
    """
    db = get_db()
    result = db.table("hospital_bed_summary") \
        .select("*") \
        .eq("governorate", governorate) \
        .gt("available_beds", 0) \
        .order("available_beds", desc=True) \
        .execute()
    return {
        "query": {"specialty": specialty, "governorate": governorate},
        "results_count": len(result.data),
        "hospitals": result.data
    }
