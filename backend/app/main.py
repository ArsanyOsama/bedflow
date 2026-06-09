# backend/app/main.py — updated with all routes
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import hospitals, beds, reports, ems_dispatch, settings as hospital_settings

app = FastAPI(
    title="BedFlow API",
    description="Real-time cross-hospital bed intelligence — Team VEROW / ECU",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hospitals.router,
                   prefix="/hospitals",       tags=["hospitals"])
app.include_router(beds.router,
                   prefix="/beds",            tags=["beds"])
app.include_router(reports.router,
                   prefix="/reports",         tags=["reports"])
app.include_router(ems_dispatch.router,
                   prefix="/api/v1/ems",      tags=["ems"])
app.include_router(hospital_settings.router,
                   prefix="/settings",        tags=["settings"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "BedFlow API v2.0", "team": "VEROW"}
