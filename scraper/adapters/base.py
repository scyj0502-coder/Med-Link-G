from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass(frozen=True)
class HospitalSource:
    id: str
    enabled: bool
    adapter: str
    region: str
    hospital_name: str
    branch_name: str
    departments: list[str]
    schedule_url: str


@dataclass(frozen=True)
class RawSchedule:
    hospital_id: str
    hospital_name: str
    branch_name: str
    department: str
    doctor_name: str
    weekday: int
    weekday_label: str
    period: str
    room: str
    source_url: str
    source_ref: str
    confidence: float
    note: str = ""
    raw_text: str = ""
    source_page: int | None = None
    parsed_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    source_file_url: str = ""
    file_hash: str = ""
    parse_status: str = "ok"
    parse_error: str = ""
    source_type: str = ""
    source_month: str = ""
    fetched_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    start_time: str = ""
    end_time: str = ""


class ScheduleAdapter:
    def __init__(self, source: HospitalSource) -> None:
        self.source = source

    def fetch(self) -> list[RawSchedule]:
        raise NotImplementedError
