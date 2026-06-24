from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

ReportType = Literal["maintenance", "lost_item", "found_item", "unknown"]

MaintenanceCategory = Literal[
    "electrical",
    "plumbing",
    "cleaning",
    "hvac",
    "infrastructure",
    "security",
    "other",
]
MaintenanceUrgency = Literal["low", "medium", "high", "critical"]

ItemCategory = Literal[
    "bags",
    "electronics",
    "clothing",
    "documents",
    "id_cards",
    "keys",
    "wallets",
    "accessories",
    "books_supplies",
    "lab_equipment",
    "bottles",
    "umbrellas",
    "sports_equipment",
    "bicycles_scooters",
    "other",
]


class DraftReport(BaseModel):
    type: ReportType
    title: str = Field(min_length=1, max_length=120)
    confidence: float = Field(ge=0, le=1)
    explanation: str = Field(min_length=3, max_length=500)


class DraftReview(BaseModel):
    required: bool
    reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_reason(self) -> Self:
        if self.required and not self.reason:
            raise ValueError("reason is required when review is required")
        return self


class MaintenanceDetails(BaseModel):
    category: MaintenanceCategory
    urgency: MaintenanceUrgency


class MaintenanceReportDraftResponse(BaseModel):
    report: DraftReport
    maintenance: MaintenanceDetails | None
    review: DraftReview

    @model_validator(mode="after")
    def validate_maintenance(self) -> Self:
        if self.report.type not in ("maintenance", "unknown"):
            raise ValueError("report type must be maintenance or unknown")
        if self.report.type == "maintenance" and self.maintenance is None:
            raise ValueError("maintenance is required for maintenance reports")
        if self.report.type == "unknown" and self.maintenance is not None:
            raise ValueError("maintenance must be null for unknown reports")
        if self.report.type == "unknown" and not self.review.required:
            raise ValueError("review is required for unknown reports")
        return self


class ReportedItem(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: ItemCategory
    color: str | None = Field(default=None, max_length=40)
    brand: str | None = Field(default=None, max_length=80)
    features: str | None = Field(default=None, max_length=500)


class ItemReportDraftResponse(BaseModel):
    report: DraftReport
    item: ReportedItem | None
    review: DraftReview

    @model_validator(mode="after")
    def validate_item(self) -> Self:
        if self.report.type not in ("lost_item", "found_item", "unknown"):
            raise ValueError("report type must be lost_item, found_item, or unknown")
        if self.report.type in ("lost_item", "found_item") and self.item is None:
            raise ValueError("item is required for item reports")
        if self.report.type == "unknown" and self.item is not None:
            raise ValueError("item must be null for unknown reports")
        if self.report.type == "unknown" and not self.review.required:
            raise ValueError("review is required for unknown reports")
        return self


class MatchingRunResponse(BaseModel):
    processed: int = Field(ge=0)
    created: int = Field(ge=0)
    failed: int = Field(ge=0)
