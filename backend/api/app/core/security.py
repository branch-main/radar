from typing import Annotated

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.core.settings import settings

api_key_header = APIKeyHeader(
    name="X-API-Key",
    scheme_name="ApiKeyAuth",
    auto_error=False,
)


def require_api_key(
    x_api_key: Annotated[str | None, Security(api_key_header)] = None,
) -> None:
    if x_api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key",
        )
    if x_api_key != settings.backend_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )
