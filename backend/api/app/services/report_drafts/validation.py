from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

from app.services.report_drafts.errors import ReportDraftFailure, ReportDraftRejection

DraftModel = TypeVar("DraftModel", bound=BaseModel)


def validate_draft_payload(payload: Any, schema: type[DraftModel]) -> DraftModel:
    try:
        rejection_reason = _rejection_reason(payload)
        if rejection_reason:
            raise ReportDraftRejection(rejection_reason)

        draft = schema.model_validate(payload)
        if _report_type(draft) == "unknown":
            raise ReportDraftRejection(_unknown_reason(draft))

        return draft
    except ReportDraftRejection:
        raise
    except (ValidationError, ValueError, TypeError) as exc:
        raise ReportDraftFailure("OpenAI returned an invalid report draft") from exc


def _rejection_reason(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None
    error = payload.get("error")
    if error is None:
        return None
    if not isinstance(error, dict):
        raise ValueError("OpenAI returned an invalid report draft error")
    reason = error.get("reason")
    if not isinstance(reason, str) or not reason.strip():
        raise ValueError("OpenAI returned a report draft error without a reason")
    return reason.strip()[:500]


def _report_type(draft: BaseModel) -> str | None:
    report = getattr(draft, "report", None)
    report_type = getattr(report, "type", None)
    return report_type if isinstance(report_type, str) else None


def _unknown_reason(draft: BaseModel) -> str:
    report = getattr(draft, "report", None)
    review = getattr(draft, "review", None)
    for value in (
        getattr(review, "reason", None),
        getattr(report, "explanation", None),
    ):
        if isinstance(value, str) and value.strip():
            return value.strip()[:500]
    return "No se pudo preparar un borrador útil."
