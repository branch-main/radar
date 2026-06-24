from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.security import require_api_key
from app.schemas.requests import (
    ItemReportDraftRequest,
    ItemReportType,
    ReportDraftRequest,
    UploadedPhoto,
)
from app.schemas.responses import (
    ItemReportDraftResponse,
    MaintenanceReportDraftResponse,
)
from app.services.report_drafts import ReportDraftGenerator, ReportDraftRejection

router = APIRouter(prefix="/ai", tags=["ai"])

MAX_PHOTO_BYTES = 5 * 1024 * 1024
IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
IMAGE_CONTENT_TYPE_ALIASES = {"image/jpg": "image/jpeg"}


@router.post(
    "/maintenance/report-draft",
    response_model=MaintenanceReportDraftResponse,
    summary="Preparar borrador de incidencia de mantenimiento",
    description=(
        "Genera un borrador listo para que la app lo mapee a reports y "
        "maintenance_incidents. No escribe en Supabase."
    ),
    responses={
        401: {"description": "Falta el encabezado X-API-Key."},
        403: {"description": "La API key enviada no es válida."},
        413: {"description": "La imagen supera el tamaño máximo permitido."},
        422: {"description": "El payload no cumple el esquema requerido."},
    },
)
def create_maintenance_report_draft(
    description: Annotated[str, Form(min_length=3, max_length=2000)],
    _: Annotated[None, Depends(require_api_key)],
    photo: Annotated[UploadFile, File()],
):
    payload = ReportDraftRequest(
        description=description,
        photo=_read_uploaded_photo(photo),
    )
    try:
        return ReportDraftGenerator().create_maintenance_draft(payload)
    except ReportDraftRejection as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "code": exc.code,
                "reason": exc.reason,
            },
        ) from exc


@router.post(
    "/lost-found/report-draft",
    response_model=ItemReportDraftResponse,
    summary="Preparar borrador de objeto perdido o encontrado",
    description=(
        "Genera un borrador listo para que la app lo mapee a reports y lost_items. "
        "No escribe en Supabase."
    ),
    responses={
        401: {"description": "Falta el encabezado X-API-Key."},
        403: {"description": "La API key enviada no es válida."},
        413: {"description": "La imagen supera el tamaño máximo permitido."},
        422: {"description": "El payload no cumple el esquema requerido."},
    },
)
def create_item_report_draft(
    description: Annotated[str, Form(min_length=3, max_length=2000)],
    _: Annotated[None, Depends(require_api_key)],
    photo: Annotated[UploadFile, File()],
    type_hint: Annotated[ItemReportType, Form()] = None,
):
    payload = ItemReportDraftRequest(
        description=description,
        photo=_read_uploaded_photo(photo),
        type_hint=type_hint,
    )
    try:
        return ReportDraftGenerator().create_item_report_draft(payload)
    except ReportDraftRejection as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "code": exc.code,
                "reason": exc.reason,
            },
        ) from exc


def _read_uploaded_photo(photo: UploadFile) -> UploadedPhoto:
    content_type = IMAGE_CONTENT_TYPE_ALIASES.get(
        photo.content_type or "",
        photo.content_type or "",
    )
    if content_type not in IMAGE_CONTENT_TYPES:
        photo.file.close()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="photo must be a JPEG, PNG, or WebP image",
        )

    try:
        data = photo.file.read(MAX_PHOTO_BYTES + 1)
    finally:
        photo.file.close()

    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="photo cannot be empty",
        )
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="photo must be 5 MB or less",
        )

    return UploadedPhoto(content_type=content_type, data=data)
