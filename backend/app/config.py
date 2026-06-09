import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    EMS_API_KEY: Optional[str] = None
    UPSTASH_REDIS_URL: str = ""
    UPSTASH_REDIS_TOKEN: str = ""

    # This finds the .env file even if you run uvicorn from a different folder
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))), ".env"),
        extra='ignore'
    )


settings = Settings()
