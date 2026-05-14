from __future__ import annotations

from adapters.base import RawSchedule
from core.models import RejectedSchedule


MIN_CONFIDENCE = 0.85
EXCLUDED_LOCATION_KEYWORDS = {"澎湖", "Penghu", "penghu"}


def reject_reason(item: RawSchedule) -> str | None:
    location_text = " ".join([
        item.hospital_name,
        item.branch_name,
        item.source_url,
        item.source_ref,
    ])
    if any(keyword in location_text for keyword in EXCLUDED_LOCATION_KEYWORDS):
        return "excluded_location"
    if item.confidence < MIN_CONFIDENCE:
        return "low_confidence"
    if not item.doctor_name:
        return "missing_doctor_name"
    if not item.department:
        return "missing_department"
    if item.weekday < 0 or item.weekday > 6:
        return "invalid_weekday"
    if item.period not in {"上午", "下午", "黃昏", "夜診"}:
        return "invalid_period"
    return None


def partition_publishable(items: list[RawSchedule]) -> tuple[list[RawSchedule], list[RejectedSchedule]]:
    publishable: list[RawSchedule] = []
    rejected: list[RejectedSchedule] = []
    for item in items:
        reason = reject_reason(item)
        if reason:
            rejected.append(RejectedSchedule(item=item, reason=reason))
        else:
            publishable.append(item)
    return publishable, rejected
