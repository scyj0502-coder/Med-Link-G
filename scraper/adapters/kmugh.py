from __future__ import annotations

import json
from pathlib import Path

from adapters.base import HospitalSource, RawSchedule, ScheduleAdapter


class KmughAdapter(ScheduleAdapter):
    """Okayama first slice.

    This starts by reusing the current prototype JSON so the formal pipeline can
    be wired end-to-end. The OCR/PDF parser can replace this loader without
    changing downstream quality, DB, or notification code.
    """

    def __init__(self, source: HospitalSource, fixture_path: Path | None = None) -> None:
        super().__init__(source)
        self.fixture_path = fixture_path or Path("../data/okayama.json")

    def fetch(self) -> list[RawSchedule]:
        payload = json.loads(self.fixture_path.read_text(encoding="utf-8"))
        schedules: list[RawSchedule] = []
        for item in payload.get("sessions", []):
            if item.get("category") not in self.source.departments:
                continue
            schedules.append(
                RawSchedule(
                    hospital_id=self.source.id,
                    hospital_name=self.source.hospital_name,
                    branch_name=self.source.branch_name,
                    department=item.get("category", item.get("department", "")),
                    doctor_name=item.get("doctorName", ""),
                    weekday=int(item.get("weekdays", [0])[0]),
                    weekday_label=item.get("sourceWeekdayLabel", ""),
                    period=item.get("period", ""),
                    room=item.get("room", ""),
                    source_url=self.source.schedule_url,
                    source_ref=f"page:{item.get('sourcePage', '')};id:{item.get('id', '')}",
                    confidence=0.92,
                )
            )
        return schedules

