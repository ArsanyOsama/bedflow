# backend/app/routes/reports.py
# FULL REPLACEMENT — was a copy of hospitals.py, /reports/weekly/{id} did not exist
# Fixes: B-06

import io
from typing import Any, Dict, List, Literal
from datetime import datetime, timedelta
from typing import Any, Dict, List, Literal, cast
from postgrest.types import CountMethod  # <-- Add this import
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.database import get_db

router = APIRouter()


@router.get("/weekly/{hospital_id}")
def get_weekly_report(
    hospital_id: str,
    days: int = Query(14, ge=7, le=90),
    format: Literal["json", "pdf"] = "json",
):
    """
    GET /reports/weekly/{hospital_id}?days=14&format=json|pdf
    Returns analytics + occupancy timeline for the given period.
    """
    db = get_db()
    since_ts = (datetime.utcnow() - timedelta(days=days)).isoformat()
    since_date = (datetime.utcnow() - timedelta(days=days)).date().isoformat()

# 1. Hospital settings
    s_res = db.table("hospital_settings") \
        .select("*").eq("hospital_id", hospital_id).single().execute()

    # FIX: Use cast to force Pylance to accept the type
    settings = cast(Dict[str, Any], s_res.data) if s_res.data else {
        "bed_price_per_day": 2000, "currency": "EGP"}
    bed_price = float(settings.get("bed_price_per_day", 2000) or 2000)

    # 2. Current snapshot
    snap_res = db.table("hospital_bed_summary") \
        .select("*").eq("hospital_id", hospital_id).single().execute()
    if not snap_res.data:
        raise HTTPException(404, f"Hospital {hospital_id} not found")

    # FIX: Use cast
    summary = cast(Dict[str, Any], snap_res.data)

    # 3. Daily snapshots for timeline
    tl_res = db.table("daily_bed_snapshots") \
        .select("snapshot_date, occupancy_rate, available_beds, occupied_beds") \
        .eq("hospital_id", hospital_id) \
        .gte("snapshot_date", since_date) \
        .order("snapshot_date") \
        .execute()

    # FIX: Use cast
    snapshots = cast(List[Dict[str, Any]], tl_res.data) if tl_res.data else []

    # 4. Log counts — scoped to this hospital's beds only
    wards_res = db.table("wards").select("id") \
        .eq("hospital_id", hospital_id).eq("active", True).execute()

    # Cast the result to explicitly tell Pylance this is a list of dicts
    wards_data = cast(List[Dict[str, Any]], wards_res.data or [])
    ward_ids = [w["id"] for w in wards_data]

    beds_made_available = 0
    total_changes = 0

    if ward_ids:
        bed_res = db.table("beds").select(
            "id").in_("ward_id", ward_ids).execute()
        beds_data = cast(List[Dict[str, Any]], bed_res.data or [])
        bed_ids = [b["id"] for b in beds_data]

        if bed_ids:
            # Use CountMethod.exact instead of the string "exact"
            a_res = db.table("bed_status_logs") \
                .select("id", count=CountMethod.exact) \
                .eq("new_status", "available") \
                .in_("bed_id", bed_ids) \
                .gte("changed_at", since_ts).execute()
            beds_made_available = a_res.count or 0

            t_res = db.table("bed_status_logs") \
                .select("id", count=CountMethod.exact) \
                .in_("bed_id", bed_ids) \
                .gte("changed_at", since_ts).execute()
            total_changes = t_res.count or 0

    # 5. Derived metrics
    avg_occupancy = round(
        sum(float(s.get("occupancy_rate") or 0)
            for s in snapshots) / max(len(snapshots), 1), 1
    ) if snapshots else float(summary.get("occupancy_rate", 0) or 0)

    revenue_recovered = round(beds_made_available * bed_price * 0.3, 2)

    total_beds = int(summary.get("total_beds", 1) or 1)
    avail_beds = int(summary.get("available_beds", 0) or 0)
    availability_pct = (avail_beds / total_beds) * 100
    turnover_pct = min((total_changes / (total_beds * days)) * 100, 100)
    efficiency_score = round(
        availability_pct * 0.4 + (100 - avg_occupancy) *
        0.3 + turnover_pct * 0.3, 1
    )
    efficiency_score = max(0.0, min(100.0, efficiency_score))

    payload = {
        "hospital_id":      hospital_id,
        "hospital_name_en": summary.get("name_en", ""),
        "hospital_name_ar": summary.get("name_ar", ""),
        "period_days":      days,
        "generated_at":     datetime.utcnow().isoformat(),
        "snapshot": {
            "total_beds":     summary.get("total_beds", 0),
            "available_beds": summary.get("available_beds", 0),
            "occupied_beds":  summary.get("occupied_beds", 0),
            "occupancy_rate": summary.get("occupancy_rate", 0),
        },
        "analytics": {
            "avg_occupancy":        avg_occupancy,
            "beds_made_available":  beds_made_available,
            "revenue_recovered":    revenue_recovered,
            "efficiency_score":     efficiency_score,
            "total_status_changes": total_changes,
            "bed_price_per_day":    bed_price,
            "currency":             settings.get("currency", "EGP"),
        },
        "timeline": [
            {
                "date":           s.get("snapshot_date"),
                "occupancy_rate": float(s.get("occupancy_rate") or 0),
                "available_beds": s.get("available_beds", 0),
                "occupied_beds":  s.get("occupied_beds", 0),
            }
            for s in snapshots
        ],
    }

    return _generate_pdf(payload) if format == "pdf" else payload


def _generate_pdf(data: Dict[str, Any]) -> StreamingResponse:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors as rc
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
        )
        from reportlab.lib.enums import TA_CENTER
    except ImportError:
        raise HTTPException(
            500, "Install reportlab: pip install reportlab --break-system-packages")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            topMargin=2*cm, bottomMargin=2*cm,
                            leftMargin=2*cm, rightMargin=2*cm)
    teal = rc.HexColor("#00C896")
    dark = rc.HexColor("#0D1B2A")
    gray = rc.HexColor("#8896AB")
    offwhite = rc.HexColor("#F5F4F0")

    def _style(name, **kw):
        return ParagraphStyle(name, **kw)

    title_s = _style("T", fontSize=22, textColor=dark,
                     fontName="Helvetica-Bold", spaceAfter=3)
    sub_s = _style("S", fontSize=10, textColor=gray, spaceAfter=2)
    sec_s = _style("H", fontSize=13, textColor=teal,
                   fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=6)
    foot_s = _style("F", fontSize=8,  textColor=gray, alignment=TA_CENTER)

    an = data["analytics"]
    sn = data["snapshot"]
    tl = data["timeline"]
    story: List[Any] = []

    story += [
        Paragraph("BedFlow", title_s),
        Paragraph(
            f"Analytics Report  ·  {data['hospital_name_en']}  ({data['hospital_name_ar']})", sub_s),
        Paragraph(
            f"Period: Last {data['period_days']} days  ·  Generated {data['generated_at'][:10]}", sub_s),
        HRFlowable(width="100%", thickness=1.5, color=teal, spaceAfter=12),
    ]

    # Key metrics table
    story.append(Paragraph("Key Performance Metrics", sec_s))
    m = [
        ["Metric", "Value"],
        ["Revenue Recovered",    f"EGP {an['revenue_recovered']:,.0f}"],
        ["Beds Made Available",  str(an["beds_made_available"])],
        ["Average Occupancy",    f"{an['avg_occupancy']}%"],
        ["Efficiency Score",     f"{an['efficiency_score']} / 100"],
        ["Total Status Changes", str(an["total_status_changes"])],
        ["Bed Price / Day",      f"EGP {an['bed_price_per_day']:,.0f}"],
    ]
    t1 = Table(m, colWidths=[9*cm, 8*cm])
    t1.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0),
         dark), ("TEXTCOLOR", (0, 0), (-1, 0), rc.white),
        ("FONTNAME",   (0, 0), (-1, 0),
         "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [rc.white, offwhite]),
        ("GRID", (0, 0), (-1, -1), 0.5, rc.HexColor("#E4E8EE")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t1)

    # Snapshot
    story.append(Paragraph("Current Snapshot", sec_s))
    s2 = [
        ["Total Beds", "Available", "Occupied", "Occupancy"],
        [str(sn["total_beds"]), str(sn["available_beds"]),
         str(sn["occupied_beds"]), f"{sn['occupancy_rate']}%"],
    ]
    t2 = Table(s2, colWidths=[4.25*cm]*4)
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0),
         teal), ("TEXTCOLOR", (0, 0), (-1, 0), rc.white),
        ("FONTNAME", (0, 0), (-1, 0),
         "Helvetica-Bold"), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTSIZE", (0, 0), (-1, -1), 10), ("GRID",
                                             (0, 0), (-1, -1), 0.5, rc.HexColor("#E4E8EE")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t2)

    # Timeline
    if tl:
        story.append(
            Paragraph("Occupancy Timeline (most recent 7 data points)", sec_s))
        tl_rows = [["Date", "Occupancy %", "Available", "Occupied"]] + [
            [str(s["date"])[-10:], f"{s['occupancy_rate']}%",
             str(s["available_beds"]), str(s["occupied_beds"])]
            for s in tl[-7:]
        ]
        t3 = Table(tl_rows, colWidths=[4.25*cm]*4)
        t3.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0),
             dark), ("TEXTCOLOR", (0, 0), (-1, 0), rc.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [rc.white, offwhite]),
            ("FONTSIZE", (0, 0), (-1, -1), 9), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, rc.HexColor("#E4E8EE")),
        ]))
        story.append(t3)

    story += [
        Spacer(1, 0.5*cm),
        HRFlowable(width="100%", thickness=0.5, color=gray),
        Paragraph("BedFlow  ·  VEROW Team  ·  ECU 2026", foot_s),
    ]

    doc.build(story)
    buf.seek(0)
    slug = (data.get("hospital_name_en") or "report").replace(" ", "_")
    fname = f"BedFlow_{slug}_{data['period_days']}d_{data['generated_at'][:10]}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{fname}"'})
