from datetime import UTC, datetime
from typing import Any

from app.core.settings import settings

ACTIVE_ITEM_STATUSES = ["unclaimed", "claim_pending"]
ACTIVE_REPORT_STATUSES = ["new", "classified", "waiting_claim", "resolved"]


def pending_jobs(supabase: Any) -> list[dict[str, Any]]:
    response = (
        supabase.table("matching_jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(settings.matching_batch_size)
        .execute()
    )
    return _rows(response.data)


def find_report(supabase: Any, report_id: str) -> dict[str, Any] | None:
    return _first(
        supabase.table("reports")
        .select("*")
        .eq("id", report_id)
        .limit(1)
        .execute()
        .data
    )


def find_report_item(supabase: Any, report_id: str) -> dict[str, Any] | None:
    return _first(
        supabase.table("lost_items")
        .select("*")
        .eq("report_id", report_id)
        .limit(1)
        .execute()
        .data
    )


def candidate_items(
    supabase: Any,
    source_report: dict[str, Any],
    source_item: dict[str, Any],
) -> list[dict[str, Any]]:
    wanted_type = "found_item" if source_report["type"] == "lost_item" else "lost_item"
    query = (
        supabase.table("lost_items")
        .select("*, reports(*)")
        .in_("status", ACTIVE_ITEM_STATUSES)
        .neq("report_id", source_report["id"])
        .order("created_at", desc=True)
        .limit(settings.matching_candidate_limit)
    )

    category = _normalized(source_item.get("item_category"))
    if category and category != "other":
        query = query.eq("item_category", source_item["item_category"])

    candidates = []
    for candidate_item in _rows(query.execute().data):
        candidate_report = candidate_item.get("reports")
        if not candidate_report:
            continue
        if candidate_report.get("type") != wanted_type:
            continue
        if candidate_report.get("status") not in ACTIVE_REPORT_STATUSES:
            continue
        candidates.append(candidate_item)
    return candidates


def match_exists(
    supabase: Any,
    source_report_id: str,
    target_report_id: str,
) -> bool:
    existing = (
        supabase.table("matches")
        .select("id")
        .eq("source_report_id", source_report_id)
        .eq("target_report_id", target_report_id)
        .limit(1)
        .execute()
        .data
    )
    if _first(existing):
        return True

    reversed_existing = (
        supabase.table("matches")
        .select("id")
        .eq("source_report_id", target_report_id)
        .eq("target_report_id", source_report_id)
        .limit(1)
        .execute()
        .data
    )
    return bool(_first(reversed_existing))


def create_match(
    supabase: Any,
    source_report_id: str,
    target_report_id: str,
    score: float,
    reason: str,
) -> None:
    supabase.table("matches").insert(
        {
            "source_report_id": source_report_id,
            "target_report_id": target_report_id,
            "score": round(score, 3),
            "reason": reason,
            "status": "suggested",
        }
    ).execute()


def mark_job_processing(supabase: Any, job: dict[str, Any]) -> None:
    supabase.table("matching_jobs").update(
        {
            "status": "processing",
            "attempts": int(job.get("attempts") or 0) + 1,
            "locked_at": _now(),
            "last_error": None,
        }
    ).eq("id", job["id"]).execute()


def mark_job_processed(supabase: Any, job: dict[str, Any]) -> None:
    supabase.table("matching_jobs").update(
        {
            "status": "processed",
            "processed_at": _now(),
            "last_error": None,
        }
    ).eq("id", job["id"]).execute()


def mark_job_failed(supabase: Any, job: dict[str, Any], exc: Exception) -> None:
    supabase.table("matching_jobs").update(
        {
            "status": "failed",
            "last_error": str(exc)[:1000],
            "locked_at": None,
        }
    ).eq("id", job["id"]).execute()


def _rows(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return data
    return []


def _first(data: Any) -> dict[str, Any] | None:
    rows = _rows(data)
    return rows[0] if rows else None


def _normalized(value: Any) -> str:
    return str(value or "").strip().lower()


def _now() -> str:
    return datetime.now(UTC).isoformat()
