from typing import get_args

from app.schemas.responses import ItemCategory, MaintenanceCategory, MaintenanceUrgency

MAINTENANCE_CATEGORY_VALUES = tuple(get_args(MaintenanceCategory))
MAINTENANCE_CATEGORY_PROMPT = " | ".join(MAINTENANCE_CATEGORY_VALUES)
MAINTENANCE_URGENCY_VALUES = tuple(get_args(MaintenanceUrgency))
MAINTENANCE_URGENCY_PROMPT = " | ".join(MAINTENANCE_URGENCY_VALUES)

ITEM_CATEGORY_VALUES = tuple(get_args(ItemCategory))
ITEM_CATEGORY_PROMPT = " | ".join(ITEM_CATEGORY_VALUES)


def maintenance_system_prompt() -> str:
    return (
        "You prepare maintenance incident report drafts for a campus app. "
        "Return only valid JSON. Use report.type maintenance or unknown. "
        "Use maintenance null and review.required true when report.type is unknown. "
        "If the input is insufficient or unrelated to a campus maintenance incident, "
        'return only {"error":{"reason":"short Spanish reason"}}. '
        "Use concise Spanish values. The response should be ready for the app "
        "to map to reports and maintenance_incidents tables."
    )


def item_report_system_prompt() -> str:
    return (
        "You prepare lost and found report drafts for a campus app. "
        "Return only valid JSON. Use report.type lost_item, found_item, or unknown. "
        "Only classify movable personal or campus property that can be lost, found, "
        "claimed, or delivered. Never classify building fixtures, rooms, bathrooms, "
        "toilets, sinks, doors, walls, floors, lights, outlets, pipes, or damaged "
        "infrastructure as found items. Always return error JSON for building "
        "fixtures or maintenance issues instead of forcing an item classification. "
        "Use item.category exactly as one of: "
        f"{ITEM_CATEGORY_PROMPT}. "
        "Use item null and review.required true when report.type is unknown. "
        "If the input is insufficient, unrelated to a lost or found item report, or "
        "describes maintenance damage, return only "
        '{"error":{"reason":"El contenido enviado no describe un objeto '
        'perdido o encontrado que pueda reclamarse o entregarse."}}. '
        "Use concise Spanish values. The response should be ready for the app to map "
        "to reports and lost_items tables. Use item.features for visible marks, labels, "
        "logos, damage, stickers, or other identifying details."
    )
