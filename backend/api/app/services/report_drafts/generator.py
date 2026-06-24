from app.schemas.requests import ItemReportDraftRequest, ReportDraftRequest
from app.schemas.responses import (
    DraftReport,
    DraftReview,
    ItemReportDraftResponse,
    MaintenanceReportDraftResponse,
)
from app.services.report_drafts.errors import ReportDraftFailure
from app.services.report_drafts.openai_json import request_json_payload
from app.services.report_drafts.prompts import (
    ITEM_CATEGORY_PROMPT,
    MAINTENANCE_CATEGORY_PROMPT,
    MAINTENANCE_URGENCY_PROMPT,
    item_report_system_prompt,
    maintenance_system_prompt,
)
from app.services.report_drafts.validation import validate_draft_payload

UNKNOWN_REPORT = DraftReport(
    type="unknown",
    title="Reporte sin clasificar",
    confidence=0,
    explanation="No se pudo clasificar automáticamente.",
)
UNKNOWN_REVIEW = DraftReview(
    required=True,
    reason="No se pudo clasificar automáticamente.",
)


class ReportDraftGenerator:
    def create_maintenance_draft(
        self,
        request: ReportDraftRequest,
    ) -> MaintenanceReportDraftResponse:
        try:
            payload = request_json_payload(
                request=request,
                system_prompt=maintenance_system_prompt(),
                user_payload={
                    "description": request.description,
                    "photo_attached": True,
                    "error_json_shape": {
                        "error": {
                            "reason": (
                                "short Spanish reason why a draft cannot be prepared"
                            )
                        }
                    },
                    "required_json_shape": {
                        "report": {
                            "type": "maintenance | unknown",
                            "title": "short title for reports.title",
                            "confidence": "number from 0 to 1",
                            "explanation": "short Spanish explanation",
                        },
                        "maintenance": {
                            "category": MAINTENANCE_CATEGORY_PROMPT,
                            "urgency": MAINTENANCE_URGENCY_PROMPT,
                        },
                        "review": {
                            "required": "boolean",
                            "reason": "reason when required is true, otherwise null",
                        },
                    },
                },
            )
            return validate_draft_payload(payload, MaintenanceReportDraftResponse)
        except ReportDraftFailure:
            return MaintenanceReportDraftResponse(
                report=UNKNOWN_REPORT,
                maintenance=None,
                review=UNKNOWN_REVIEW,
            )

    def create_item_report_draft(
        self,
        request: ItemReportDraftRequest,
    ) -> ItemReportDraftResponse:
        try:
            payload = request_json_payload(
                request=request,
                system_prompt=item_report_system_prompt(),
                user_payload={
                    "description": request.description,
                    "photo_attached": True,
                    "type_hint": request.type_hint,
                    "domain_rules": [
                        "item must be movable and possible to lose, find, claim, or deliver",
                        "building fixtures and maintenance damage must return error_json_shape",
                    ],
                    "error_json_shape": {
                        "error": {
                            "reason": (
                                "short Spanish reason why a draft cannot be prepared"
                            )
                        }
                    },
                    "required_json_shape": {
                        "report": {
                            "type": "lost_item | found_item | unknown",
                            "title": "short title for reports.title",
                            "confidence": "number from 0 to 1",
                            "explanation": "short Spanish explanation",
                        },
                        "item": {
                            "name": "object name",
                            "category": ITEM_CATEGORY_PROMPT,
                            "color": "main color or null",
                            "brand": "brand or null",
                            "features": "identifying details or null",
                        },
                        "review": {
                            "required": "boolean",
                            "reason": "reason when required is true, otherwise null",
                        },
                    },
                },
            )
            return validate_draft_payload(payload, ItemReportDraftResponse)
        except ReportDraftFailure:
            return ItemReportDraftResponse(
                report=UNKNOWN_REPORT,
                item=None,
                review=UNKNOWN_REVIEW,
            )
