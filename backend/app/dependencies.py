from fastapi import Header, HTTPException
from app.config import settings


def verify_ems_key(x_api_key: str = Header(..., alias="X-API-Key")):
    if x_api_key != settings.EMS_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid EMS API key")
    return x_api_key
