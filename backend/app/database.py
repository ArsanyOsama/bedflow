import os
from supabase import create_client, Client
from app.config import settings

# Force a check to ensure we have the URL
if not settings.SUPABASE_URL:
    # Look for .env in the parent directory (backend/) explicitly
    env_path = os.path.join(os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))), ".env")
    print(f"DEBUG: Loading .env from {env_path}")
    # If it's still missing, this will print clearly
    raise ValueError("SUPABASE_URL is missing! Check your .env file.")

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY or ""
)


def get_db() -> Client:
    return supabase
