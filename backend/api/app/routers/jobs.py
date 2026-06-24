from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.security import require_api_key
from app.schemas.responses import MatchingRunResponse
from app.services.matching import run_matching_jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post(
    "/matching/run",
    response_model=MatchingRunResponse,
    summary="Ejecutar matching de objetos perdidos",
    description="Procesa trabajos pendientes de matching de objetos perdidos y encontrados.",
    responses={
        401: {"description": "Falta el encabezado X-API-Key."},
        403: {"description": "La API key enviada no es válida."},
    },
)
def run_lost_found_matching(
    _: Annotated[None, Depends(require_api_key)],
):
    return run_matching_jobs()
