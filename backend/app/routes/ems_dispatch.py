import math
from typing import Optional, Literal, Dict, Any, List, Union, cast
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import verify_ems_key

router = APIRouter()

# ── SCORING CONSTANTS ─────────────────────────────────────────────────────────
WEIGHT_AVAILABILITY = 0.45
WEIGHT_DISTANCE = 0.35
WEIGHT_SPECIALTY = 0.20
MAX_DISTANCE_KM = 50

WARD_TYPE_MAP = {
    "ICU":               "ICU",
    "Internal Medicine": "Internal",
    "Pediatrics":        "Pediatric",
    "Emergency":         "ER",
    "Surgery":           "Surgery",
    "Maternity":         "Maternity",
    "General":           "General",
}


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * \
        math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def score_hospital(hospital: Dict[str, Any], wards_with_beds: List[Dict[str, Any]],
                   target_specialty: str, ems_lat: float, ems_lng: float) -> Dict[str, Any]:

    distance_km = haversine(ems_lat, ems_lng, float(
        hospital.get("lat", 0.0)), float(hospital.get("lng", 0.0)))
    distance_score = max(0.0, 1 - (distance_km / MAX_DISTANCE_KM))
    estimated_time_min = round(distance_km / 0.6)

    specialty_match = 0.0
    availability_score = 0.0
    matching_ward: Optional[Dict[str, Any]] = None
    available_beds_in_ward = 0

    for ward in wards_with_beds:
        if ward.get("specialty", "").lower() == target_specialty.lower():
            beds = ward.get("beds", [])
            available = sum(1 for b in beds if isinstance(
                b, dict) and b.get("current_status") == "available")
            total = max(len(beds), 1)
            availability_score = available / total
            available_beds_in_ward = available
            specialty_match = 1.0
            matching_ward = ward
            break

    if not matching_ward:
        for ward in wards_with_beds:
            if ward.get("specialty", "").lower() in ("general", "internal"):
                beds = ward.get("beds", [])
                available = sum(1 for b in beds if isinstance(
                    b, dict) and b.get("current_status") == "available")
                total = max(len(beds), 1)
                availability_score = available / total
                available_beds_in_ward = available
                specialty_match = 0.5
                matching_ward = ward
                break

    if not matching_ward:
        tot = max(int(hospital.get("total_beds", 0)), 1)
        availability_score = int(hospital.get("available_beds", 0)) / tot
        specialty_match = 0.0
        available_beds_in_ward = int(hospital.get("available_beds", 0))

    composite = (
        WEIGHT_AVAILABILITY * availability_score
        + WEIGHT_DISTANCE * distance_score
        + WEIGHT_SPECIALTY * specialty_match
    ) * 100

    if available_beds_in_ward == 0:
        composite = 0.0

    return {
        "score":                 round(composite, 1),
        "distance_km":           round(distance_km, 1),
        "estimated_time_min":    estimated_time_min,
        "availability_pct":      round(availability_score * 100, 1),
        "specialty_match":       specialty_match,
        "specialty_match_label": "Exact" if specialty_match == 1.0 else ("General" if specialty_match == 0.5 else "None"),
        "matching_ward_id":      matching_ward.get("id") if matching_ward else None,
        "matching_ward_name":    matching_ward.get("name_en") if matching_ward else None,
        "available_beds_in_ward": available_beds_in_ward,
    }

# ── MODELS ────────────────────────────────────────────────────────────────────


class ScoreRequest(BaseModel):
    ems_lat:   float
    ems_lng:   float
    case_type: str
    severity:  Literal["critical", "high", "medium", "low"] = "medium"
    governorate: str = "Cairo"


class DispatchRequest(BaseModel):
    hospital_id:   str
    ward_id:       Optional[str] = None
    case_type:     str
    severity:      Literal["critical", "high", "medium", "low"] = "medium"
    ems_lat:       float
    ems_lng:       float
    distance_km:   float
    composite_score: float
    patient_notes: Optional[str] = None
    device_id:     Optional[str] = None


class AcceptRequest(BaseModel):
    bed_id:   Optional[str] = None

# ── ROUTES ────────────────────────────────────────────────────────────────────


@router.post("/score")
def score_hospitals(payload: ScoreRequest):
    db = get_db()
    target_specialty = WARD_TYPE_MAP.get(payload.case_type, payload.case_type)

    hospitals_res = db.table("hospitals").select(
        "*").eq("active", True).execute()
    hospitals_list = cast(List[Dict[str, Any]], hospitals_res.data or [])

    summary_res = db.table("hospital_bed_summary").select("*").execute()
    summary_list = cast(List[Dict[str, Any]], summary_res.data or [])
    summary_map = {s.get("hospital_id"): s for s in summary_list}

    results = []
    for hospital in hospitals_list:
        h_id = str(hospital.get("id"))

        wards_res = db.table("wards").select(
            "*").eq("hospital_id", h_id).eq("active", True).execute()
        wards_with_beds = cast(List[Dict[str, Any]], wards_res.data or [])

        summary = summary_map.get(h_id, {})
        hospital_data = {**hospital, **summary}

        scored = score_hospital(hospital_data, wards_with_beds,
                                target_specialty, payload.ems_lat, payload.ems_lng)
        scored.update({
            "hospital_id":     h_id,
            "name_ar":         hospital.get("name_ar"),
            "name_en":         hospital.get("name_en"),
            "lat":             hospital.get("lat"),
            "lng":             hospital.get("lng"),
            "recommended":     scored["score"] > 0
        })
        results.append(scored)

    results.sort(key=lambda x: (-x["score"], x["distance_km"]))
    return {"results": results}


@router.post("/request")
def submit_dispatch_request(payload: DispatchRequest):
    db = get_db()
    settings_res = db.table("hospital_settings").select(
        "*").eq("hospital_id", payload.hospital_id).single().execute()
    settings = cast(Dict[str, Any], settings_res.data or {
                    "ems_mode": "manual"})
    ems_mode = str(settings.get("ems_mode", "manual"))

    ward_id = payload.ward_id
    if not ward_id:
        target_specialty = WARD_TYPE_MAP.get(
            payload.case_type, payload.case_type)
        ward_res = db.table("wards").select("id, specialty").eq(
            "hospital_id", payload.hospital_id).eq("active", True).execute()
        for ward in cast(List[Dict[str, Any]], ward_res.data or []):
            if ward.get("specialty", "").lower() == target_specialty.lower():
                ward_id = str(ward.get("id"))
                break

    req_data = {
        "hospital_id":     payload.hospital_id,
        "ward_id":         ward_id,
        "case_type":       payload.case_type,
        "severity":        payload.severity,
        "dispatch_mode":   ems_mode,
        "status":          "pending",
    }
    req_res = db.table("ems_requests").insert(req_data).execute()
    request = cast(Dict[str, Any], (req_res.data or [{}])[0])
    request_id = str(request.get("id"))

    if ems_mode == "auto":
        reserved = _auto_reserve_bed(
            db, request_id, ward_id, payload.hospital_id)
        if reserved:
            return {"status": "accepted", "bed": reserved}
        return {"status": "rejected", "message": "No beds available"}

    return {"status": "pending", "request_id": request_id}


def _auto_reserve_bed(db, request_id: str, ward_id: Optional[str], hospital_id: str) -> Optional[Dict[str, Any]]:
    query = db.table("beds").select("*").eq("current_status",
                                            "available").eq("ems_locked", False)

    if ward_id:
        query = query.eq("ward_id", ward_id)
    else:
        ward_res = db.table("wards").select("id").eq(
            "hospital_id", hospital_id).execute()
        ward_ids = [str(w.get("id"))
                    for w in cast(List[Dict[str, Any]], ward_res.data or [])]
        if not ward_ids:
            return None
        query = query.in_("ward_id", ward_ids)

    res = query.limit(1).execute()
    bed = cast(Optional[Dict[str, Any]], (res.data or [None])[0])

    if bed:
        bed_id = str(bed.get("id"))
        db.table("beds").update({"current_status": "reserved", "ems_locked": True}).eq(
            "id", bed_id).execute()
        return bed
    return None


@router.post("/request/{request_id}/accept")
def accept_request(request_id: str, payload: AcceptRequest):
    db = get_db()
    # 1. Update request status
    db.table("ems_requests").update({"status": "accepted", "responded_at": datetime.utcnow(
    ).isoformat()}).eq("id", request_id).execute()

    # 2. If bed_id is provided, lock it
    if payload.bed_id:
        db.table("beds").update({
            "current_status": "reserved",
            "ems_locked": True,
            "ems_request_id": request_id
        }).eq("id", payload.bed_id).execute()

    return {"status": "accepted"}


@router.post("/request/{request_id}/reject")
def reject_request(request_id: str, reason: str = ""):
    db = get_db()
    db.table("ems_requests").update({
        "status": "rejected",
        "rejection_reason": reason
    }).eq("id", request_id).execute()
    return {"status": "rejected"}
