import json
from typing import Any

from openai import OpenAI, OpenAIError

from app.core.settings import settings


def image_match_score(
    source_report: dict[str, Any],
    candidate_report: dict[str, Any],
) -> tuple[float, str] | None:
    source_photo_url = source_report.get("photo_url")
    candidate_photo_url = candidate_report.get("photo_url")
    if not settings.openai_api_key or not source_photo_url or not candidate_photo_url:
        return None

    client = OpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)
    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Compare two lost and found item photos. Return only JSON with "
                        "score from 0 to 1 and a short Spanish reason."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Decide if both images probably show the same physical item.",
                        },
                        {"type": "image_url", "image_url": {"url": source_photo_url}},
                        {"type": "image_url", "image_url": {"url": candidate_photo_url}},
                    ],
                },
            ],
            temperature=0,
            response_format={"type": "json_object"},
            timeout=30,
        )
    except OpenAIError:
        return None

    try:
        payload = json.loads(_message_content(response))
        score = float(payload.get("score", 0))
        reason = str(payload.get("reason") or "Comparación visual sin explicación.")
    except (TypeError, ValueError, json.JSONDecodeError):
        return None

    return max(0, min(score, 1)), reason[:500]


def _message_content(response: Any) -> str:
    choices = getattr(response, "choices", None)
    if not isinstance(choices, list) or not choices:
        raise ValueError("OpenAI response did not include choices")
    message = getattr(choices[0], "message", None)
    content = getattr(message, "content", None)
    if not isinstance(content, str) or not content.strip():
        raise ValueError("OpenAI response did not include text content")
    return content.strip()
