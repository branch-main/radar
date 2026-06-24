from typing import Literal

from pydantic import BaseModel, Field

ItemReportType = Literal["lost_item", "found_item"]


class UploadedPhoto(BaseModel):
    content_type: str
    data: bytes


class ReportDraftRequest(BaseModel):
    description: str = Field(min_length=3, max_length=2000)
    photo: UploadedPhoto


class ItemReportDraftRequest(ReportDraftRequest):
    type_hint: ItemReportType | None = None
