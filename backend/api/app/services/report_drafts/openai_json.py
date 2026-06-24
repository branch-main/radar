import base64
import json
from typing import Any

from openai import OpenAI, OpenAIError

from app.core.settings import settings
from app.schemas.requests import ReportDraftRequest, UploadedPhoto
from app.services.report_drafts.errors import ReportDraftFailure


def request_json_payload(
    request: ReportDraftRequest,
    system_prompt: str,
    user_payload: dict[str, Any],
) -> Any:
    if not settings.openai_api_key:
        raise ReportDraftFailure("OPENAI_API_KEY is not configured")

    client = OpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
    )
    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": _user_content(request, user_payload)},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
            timeout=30,
        )
    except OpenAIError as exc:
        raise ReportDraftFailure(f"OpenAI request failed: {exc}") from exc

    try:
        return json.loads(_clean_json(_message_content(response)))
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        raise ReportDraftFailure("OpenAI returned an invalid report draft") from exc


def _user_content(
    request: ReportDraftRequest,
    payload: dict[str, Any],
) -> list[dict[str, Any]]:
    return [
        {"type": "text", "text": json.dumps(payload, ensure_ascii=False)},
        {"type": "image_url", "image_url": {"url": _photo_data_url(request.photo)}},
    ]


def _photo_data_url(photo: UploadedPhoto) -> str:
    encoded = base64.b64encode(photo.data).decode("ascii")
    return f"data:{photo.content_type};base64,{encoded}"


def _message_content(response: Any) -> str:
    choices = getattr(response, "choices", None)
    if not isinstance(choices, list) or not choices:
        raise ReportDraftFailure("OpenAI response did not include choices")
    message = getattr(choices[0], "message", None)
    content = getattr(message, "content", None)
    if not isinstance(content, str) or not content.strip():
        raise ReportDraftFailure("OpenAI response did not include text content")
    return content


def _clean_json(content: str) -> str:
    value = content.strip()
    if value.startswith("```"):
        lines = value.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        value = "\n".join(lines).strip()
    json.loads(value)
    return value
