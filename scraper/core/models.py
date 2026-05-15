from __future__ import annotations

from dataclasses import asdict, dataclass

from adapters.base import RawSchedule


@dataclass(frozen=True)
class RejectedSchedule:
    item: RawSchedule
    reason: str


@dataclass(frozen=True)
class ScheduleChange:
    change_type: str
    schedule_key: str
    message: str
    before: dict | None
    after: dict | None


def schedule_key(item: RawSchedule) -> str:
    return "|".join([
        item.hospital_id,
        item.department,
        item.doctor_name,
        str(item.weekday),
        item.period,
        item.room,
    ])


def schedule_payload(item: RawSchedule) -> dict:
    payload = asdict(item)
    payload["schedule_key"] = schedule_key(item)
    payload["confidence_score"] = item.confidence
    return payload
