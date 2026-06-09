# backend/app/routes/reports.py
# Full analytics: timeline selection, revenue calculator, PDF with charts

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.database import get_db
from datetime import datetime, timedelta, date
from io import BytesIO
from typing import Optional, Dict, Any, List, cast

router = APIRouter()


def _get_metrics(hospital_id: str, days: int, bed_price: float, db) -> Optional[Dict[str, Any]]:
    """Shared calculation for JSON and PDF. Works on any timeline."""
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

    # Current snapshot
    summary_res = db.table("hospital_bed_summary").select("*").eq(
        "hospital_id", hospital_id).execute()

    if not summary_res.data or not isinstance(summary_res.data, list) or len(summary_res.data) == 0:
        return None

    summary = cast(Dict[str, Any], summary_res.data[0])

    # Historical snapshots for trend charts
    snapshots_res = db.table("daily_bed_snapshots").select("*").eq(
        "hospital_id", hospital_id).gte(
        "snapshot_date", (date.today() - timedelta(days=days)).isoformat()
    ).order("snapshot_date").execute()

    snapshots = cast(List[Dict[str, Any]], snapshots_res.data or [])

    # Status changes over period
    logs_res = db.table("bed_status_logs").select("new_status, changed_at").gte(
        "changed_at", cutoff).execute()
    logs = cast(List[Dict[str, Any]], logs_res.data or [])

    # Revenue calculation
    beds_made_available = sum(
        1 for l in logs if l.get("new_status") == "available")
    revenue_recovered = beds_made_available * bed_price * 0.30

    # Average occupancy over period
    snapshots_list = cast(List[Dict[str, Any]], snapshots)
    avg_occupancy = (
        sum(float(s.get("occupancy_rate", 0))
            for s in snapshots_list) / len(snapshots_list)
        if snapshots_list else float(summary.get("occupancy_rate", 0))
    )

    # Peak occupancy
    peak_vals = [float(s.get("occupancy_rate", 0)) for s in snapshots_list]
    peak_occupancy = max(peak_vals, default=float(
        summary.get("occupancy_rate", 0)))
    peak_date = next((s.get("snapshot_date") for s in snapshots_list if float(
        s.get("occupancy_rate", 0)) == peak_occupancy), None)

    # Status breakdown over period
    status_counts: Dict[str, int] = {}
    for log in logs:
        s = str(log.get("new_status", "unknown"))
        status_counts[s] = status_counts.get(s, 0) + 1

    return {
        "hospital_id":       hospital_id,
        "hospital_name_ar":  summary.get("name_ar"),
        "hospital_name_en":  summary.get("name_en"),
        "period_days":       days,
        "generated_at":      datetime.utcnow().isoformat(),
        "bed_price_per_day": bed_price,
        "snapshot": {
            "total_beds":       summary.get("total_beds", 0),
            "available_beds":   summary.get("available_beds", 0),
            "occupied_beds":    summary.get("occupied_beds", 0),
            "cleaning_beds":    summary.get("cleaning_beds", 0),
            "discharging_beds": summary.get("discharging_beds", 0),
            "reserved_beds":    summary.get("reserved_beds", 0),
            "occupancy_rate":   summary.get("occupancy_rate", 0),
        },
        "analytics": {
            "avg_occupancy":         round(avg_occupancy, 1),
            "peak_occupancy":        round(peak_occupancy, 1),
            "peak_date":             peak_date,
            "beds_made_available":   beds_made_available,
            "total_status_changes":  len(logs),
            "status_breakdown":      status_counts,
            "revenue_recovered":     round(revenue_recovered, 2),
            "revenue_formula":       f"EGP {bed_price:,.0f}/bed-day × {beds_made_available} beds × 30% recovery",
            "potential_revenue":     round(beds_made_available * bed_price, 2),
            "efficiency_score":      round(min(100.0, (beds_made_available / max(int(summary.get("total_beds", 1)) * days * 0.3, 1)) * 100), 1),
        },
        "trend_data": [
            {
                "date":           s.get("snapshot_date"),
                "occupancy_rate": s.get("occupancy_rate"),
                "available":      s.get("available_beds"),
                "occupied":       s.get("occupied_beds"),
                "cleaning":       s.get("cleaning_beds"),
            }
            for s in snapshots_list
        ],
    }


@router.get("/weekly/{hospital_id}")
def get_report(
    hospital_id: str,
    format:     str = Query(default="json", description="json or pdf"),
    days:       int = Query(default=7,    ge=1, le=365,
                            description="Timeline in days"),
    bed_price:  float = Query(
        default=0.0, ge=0, description="Override bed price (0=use settings)"),
):
    db = get_db()

    if bed_price == 0.0:
        settings_res = db.table("hospital_settings").select("bed_price_per_day").eq(
            "hospital_id", hospital_id).single().execute()

        settings_data = cast(Dict[str, Any], settings_res.data or {})
        bed_price = float(settings_data.get("bed_price_per_day", 2000.00))

    metrics = _get_metrics(hospital_id, days, bed_price, db)
    if not metrics:
        raise HTTPException(404, "Hospital not found")

    if format == "json":
        return metrics

    # ── PDF GENERATION ────────────────────────────────────────────────────────
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, KeepTogether,
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.graphics.shapes import Drawing
        from reportlab.graphics.charts.linecharts import HorizontalLineChart

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                topMargin=2*cm, bottomMargin=2*cm,
                                leftMargin=2.5*cm, rightMargin=2.5*cm)

        TEAL = colors.HexColor('#00C896')
        DARK = colors.HexColor('#0D1B2A')
        GREY = colors.HexColor('#8896AB')
        LIGHT = colors.HexColor('#F5F4F0')

        styles = getSampleStyleSheet()
        h1 = ParagraphStyle('H1', parent=styles['Heading1'], textColor=DARK,
                            fontSize=22, spaceAfter=4, fontName='Helvetica-Bold')
        h2 = ParagraphStyle('H2', parent=styles['Heading2'], textColor=DARK,
                            fontSize=14, spaceAfter=4, fontName='Helvetica-Bold')
        sub = ParagraphStyle(
            'Sub', parent=styles['Normal'], textColor=GREY, fontSize=10, spaceAfter=2)
        body = ParagraphStyle(
            'Body', parent=styles['Normal'], fontSize=10, spaceAfter=4)
        kpi_val = ParagraphStyle(
            'KPI', parent=styles['Normal'], fontSize=28, fontName='Helvetica-Bold', spaceAfter=0)
        kpi_label = ParagraphStyle(
            'KPILabel', parent=styles['Normal'], fontSize=9, textColor=GREY)
        small = ParagraphStyle(
            'Small', parent=styles['Normal'], fontSize=8, textColor=GREY)

        story = []

        # ── HEADER ─────────────────────────────────────────────────────────
        story.append(Paragraph("BedFlow Weekly Intelligence Report", h1))
        story.append(Paragraph(
            f"{metrics.get('hospital_name_en', '')} · {metrics.get('hospital_name_ar', '')}", sub))
        period_label = f"Last {days} days" if days <= 28 else f"{days}-day period"
        story.append(Paragraph(
            f"Generated: {datetime.utcnow().strftime('%d %B %Y, %H:%M UTC')} · {period_label}",
            sub))
        story.append(HRFlowable(color=TEAL, thickness=2, spaceAfter=12))

        # ── KPI CARDS ──────────────────────────────────────────────────────
        analytics = metrics.get("analytics", {})
        kpi_data = [
            [
                [Paragraph("AVERAGE OCCUPANCY", kpi_label),
                 Paragraph(f"{analytics.get('avg_occupancy', 0)}%", kpi_val)],
                [Paragraph("BEDS RECOVERED", kpi_label),
                 Paragraph(str(analytics.get('beds_made_available', 0)), kpi_val)],
                [Paragraph("REVENUE RECOVERED", kpi_label),
                 Paragraph(f"EGP {analytics.get('revenue_recovered', 0):,.0f}", kpi_val)],
            ]
        ]
        kpi_tbl = Table(kpi_data[0], colWidths=[5.5*cm, 5.5*cm, 6*cm])
        kpi_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F0FFF9')),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#FFFBF0')),
            ('BACKGROUND', (2, 0), (2, 0), colors.HexColor('#F0FAFF')),
            ('BOX', (0, 0), (0, 0), 1, colors.HexColor('#06D6A0')),
            ('BOX', (1, 0), (1, 0), 1, colors.HexColor('#D4A017')),
            ('BOX', (2, 0), (2, 0), 1, colors.HexColor('#4CC9F0')),
            ('PADDING', (0, 0), (-1, -1), 12),
        ]))
        story.append(KeepTogether([kpi_tbl, Spacer(1, 0.5*cm)]))

        # ── OCCUPANCY TREND CHART ───────────────────────────────────────────
        trend = metrics.get("trend_data", [])
        if len(trend) >= 2:
            story.append(Paragraph("Occupancy Trend", h2))
            d = Drawing(460, 150)
            chart = HorizontalLineChart()
            chart.x, chart.y, chart.width, chart.height = 50, 10, 390, 120
            chart.data = [[float(t.get("occupancy_rate", 0)) for t in trend]]
            chart.lines[0].strokeColor = TEAL
            chart.lines[0].strokeWidth = 2
            chart.valueAxis.valueMin = 0
            chart.valueAxis.valueMax = 100
            chart.valueAxis.valueStep = 20
            chart.categoryAxis.labels.angle = 30
            chart.categoryAxis.labels.fontSize = 7
            labels = [str(t.get("date", ""))[5:] for t in trend]
            if len(labels) > 14:
                labels = [l if i %
                          3 == 0 else "" for i, l in enumerate(labels)]
            chart.categoryAxis.categoryNames = labels
            d.add(chart)
            story.append(d)
            story.append(Spacer(1, 0.4*cm))

        # ── DATA TABLE ──────────────────────────────────────────────────────
        story.append(Paragraph("Detailed Metrics", h2))
        snap = metrics.get("snapshot", {})
        rows = [
            ["Metric", "Value"],
            ["Total Beds",                       str(
                snap.get("total_beds", 0))],
            ["Available Now",                    str(
                snap.get("available_beds", 0))],
            ["Occupied Now",                     str(
                snap.get("occupied_beds", 0))],
            ["Discharging Soon",                 str(
                snap.get("discharging_beds", 0))],
            ["Current Occupancy Rate",
                f"{snap.get('occupancy_rate', 0)}%"],
            ["Average Occupancy (Period)",
             f"{analytics.get('avg_occupancy', 0)}%"],
            ["Peak Occupancy",
                f"{analytics.get('peak_occupancy', 0)}%"],
            ["Total Status Changes",             str(
                analytics.get('total_status_changes', 0))],
            ["Beds Made Available",              str(
                analytics.get('beds_made_available', 0))],
            ["Bed Price Per Day",                f"EGP {bed_price:,.0f}"],
            ["Revenue Recovered (Conservative)",
             f"EGP {analytics.get('revenue_recovered', 0):,.0f}"],
            ["Efficiency Score",
                f"{analytics.get('efficiency_score', 0)}/100"],
        ]
        tbl = Table(rows, colWidths=[11*cm, 6*cm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E4E8EE')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(tbl)

        doc.build(story)
        buffer.seek(0)
        fname = f"bedflow_{hospital_id[:8]}_{days}d.pdf"
        return StreamingResponse(buffer, media_type="application/pdf",
                                 headers={"Content-Disposition": f"attachment; filename={fname}"})

    except Exception as e:
        raise HTTPException(500, f"PDF generation failed: {str(e)}")
