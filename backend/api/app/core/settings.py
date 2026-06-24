import os

from dotenv import load_dotenv

load_dotenv()


def _get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _get_list_env(name: str, default: str) -> list[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


def _get_int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if not value:
        return default
    return int(value)


def _get_float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if not value:
        return default
    return float(value)


class Settings:
    backend_api_key: str = _get_required_env("BACKEND_API_KEY")
    supabase_url: str | None = os.getenv("SUPABASE_URL") or None
    supabase_secret_key: str | None = (
        os.getenv("SUPABASE_SECRET_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or None
    )
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY") or None
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    openai_base_url: str | None = os.getenv("OPENAI_BASE_URL") or None
    matching_batch_size: int = _get_int_env("MATCHING_BATCH_SIZE", 10)
    matching_candidate_limit: int = _get_int_env("MATCHING_CANDIDATE_LIMIT", 80)
    matching_image_top_n: int = _get_int_env("MATCHING_IMAGE_TOP_N", 8)
    matching_min_score: float = _get_float_env("MATCHING_MIN_SCORE", 0.7)
    cors_origins: list[str] = _get_list_env(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )


settings = Settings()
