from __future__ import annotations

from adapters.base import RawSchedule
from core.models import ScheduleChange, schedule_key, schedule_payload


def detect_changes(previous: list[dict], current: list[RawSchedule]) -> list[ScheduleChange]:
    previous_by_key = {item["schedule_key"]: item for item in previous}
    current_by_key = {schedule_key(item): schedule_payload(item) for item in current}

    changes: list[ScheduleChange] = []
    for key, after in current_by_key.items():
        if key not in previous_by_key:
            changes.append(ScheduleChange("added", key, f"新增門診：{after['doctor_name']} {after['period']}", None, after))

    for key, before in previous_by_key.items():
        if key not in current_by_key:
            changes.append(ScheduleChange("removed", key, f"門診已移除：{before.get('doctor_name', '')}", before, None))

    return changes

