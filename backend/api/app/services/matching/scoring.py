import re
from typing import Any

TOKEN_PATTERN = re.compile(r"[a-záéíóúñ0-9]+")


def local_score(
    source_report: dict[str, Any],
    source_item: dict[str, Any],
    candidate_report: dict[str, Any],
    candidate_item: dict[str, Any],
) -> float:
    source_tokens = _tokens(_match_text(source_report, source_item))
    candidate_tokens = _tokens(_match_text(candidate_report, candidate_item))
    score = _jaccard(source_tokens, candidate_tokens) * 0.5

    if source_report.get("zone_id") and source_report.get("zone_id") == candidate_report.get("zone_id"):
        score += 0.1
    if _same_text(source_item.get("item_category"), candidate_item.get("item_category")):
        score += 0.15
    if _same_text(source_item.get("color"), candidate_item.get("color")):
        score += 0.1
    if _same_text(source_item.get("brand"), candidate_item.get("brand")):
        score += 0.08
    if _same_text(source_item.get("item_name"), candidate_item.get("item_name")):
        score += 0.07

    return min(score, 0.95)


def final_score(
    local_score_value: float,
    image_result: tuple[float, str] | None,
) -> float:
    if image_result is None:
        return local_score_value
    image_score, _ = image_result
    score = (local_score_value * 0.55) + (image_score * 0.45)
    if local_score_value >= 0.65 and image_score >= 0.65:
        score += 0.05
    return min(score, 0.99)


def match_reason(
    local_score_value: float,
    image_result: tuple[float, str] | None,
) -> str:
    parts = [f"Texto {local_score_value:.2f}"]
    if image_result is not None:
        image_score, image_reason = image_result
        parts.append(f"imagen {image_score:.2f}: {image_reason}")
    return "; ".join(parts)


def canonical_report_ids(
    source_report: dict[str, Any],
    candidate_report: dict[str, Any],
) -> tuple[str, str]:
    if source_report["type"] == "lost_item":
        return source_report["id"], candidate_report["id"]
    return candidate_report["id"], source_report["id"]


def _match_text(report: dict[str, Any], item: dict[str, Any]) -> str:
    values = [
        report.get("title"),
        report.get("description"),
        item.get("item_name"),
        item.get("item_category"),
        item.get("color"),
        item.get("brand"),
        item.get("distinguishing_marks"),
    ]
    return " ".join(str(value) for value in values if value)


def _tokens(value: str) -> set[str]:
    return {token for token in TOKEN_PATTERN.findall(value.lower()) if len(token) > 2}


def _jaccard(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0
    return len(left & right) / len(left | right)


def _same_text(left: Any, right: Any) -> bool:
    return bool(left and right and _normalized(left) == _normalized(right))


def _normalized(value: Any) -> str:
    return str(value or "").strip().lower()
