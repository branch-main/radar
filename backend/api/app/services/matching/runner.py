from typing import Any

from app.core.database import get_supabase
from app.core.settings import settings
from app.services.matching.repository import (
    candidate_items,
    create_match,
    find_report,
    find_report_item,
    mark_job_failed,
    mark_job_processed,
    mark_job_processing,
    match_exists,
    pending_jobs,
)
from app.services.matching.scoring import (
    canonical_report_ids,
    final_score,
    local_score,
    match_reason,
)
from app.services.matching.vision import image_match_score


def run_matching_jobs() -> dict[str, int]:
    supabase = get_supabase()
    jobs = pending_jobs(supabase)
    stats = {"processed": 0, "created": 0, "failed": 0}

    for job in jobs:
        mark_job_processing(supabase, job)
        try:
            created = _process_job(supabase, job["report_id"])
        except Exception as exc:
            stats["failed"] += 1
            mark_job_failed(supabase, job, exc)
            continue

        stats["processed"] += 1
        stats["created"] += created
        mark_job_processed(supabase, job)

    return stats


def _process_job(supabase: Any, report_id: str) -> int:
    source_report = find_report(supabase, report_id)
    if not source_report or source_report.get("type") not in {"lost_item", "found_item"}:
        return 0

    source_item = find_report_item(supabase, report_id)
    if not source_item:
        return 0

    scored: list[tuple[float, dict[str, Any], dict[str, Any]]] = []
    for candidate_item in candidate_items(supabase, source_report, source_item):
        candidate_report = candidate_item.get("reports")
        if not candidate_report:
            continue
        score = local_score(
            source_report,
            source_item,
            candidate_report,
            candidate_item,
        )
        scored.append((score, candidate_report, candidate_item))

    scored.sort(key=lambda candidate: candidate[0], reverse=True)
    created = 0
    for index, (score, candidate_report, _candidate_item) in enumerate(scored):
        source_report_id, target_report_id = canonical_report_ids(
            source_report,
            candidate_report,
        )
        if match_exists(supabase, source_report_id, target_report_id):
            continue

        image_result = None
        if index < settings.matching_image_top_n:
            image_result = image_match_score(source_report, candidate_report)

        combined_score = final_score(score, image_result)
        if combined_score < settings.matching_min_score:
            continue

        create_match(
            supabase,
            source_report_id,
            target_report_id,
            combined_score,
            match_reason(score, image_result),
        )
        created += 1

    return created
