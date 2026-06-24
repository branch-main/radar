from functools import lru_cache

from supabase import Client, create_client

from app.core.settings import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise RuntimeError("Supabase is not configured")

    return create_client(settings.supabase_url, settings.supabase_secret_key)
