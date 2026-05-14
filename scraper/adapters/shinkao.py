from __future__ import annotations

import re
import httpx
from bs4 import BeautifulSoup

from adapters.base import RawSchedule, ScheduleAdapter


WEEKDAY_LABELS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
PERIOD_ALIASES = {
    "上午": "上午",
    "下午": "下午",
    "晚上": "夜診",
    "夜診": "夜診",
}
SKIP_TABLE_LABELS = {"內科系", "外科系"}
DOCTOR_NAME_PATTERN = re.compile(r"^[\u4e00-\u9fff]{2,4}")


class ShinkaoAdapter(ScheduleAdapter):
    """Parse Shinkao Hospital's HTML outpatient schedule table."""

    def fetch(self) -> list[RawSchedule]:
        response = httpx.get(self.source.schedule_url, timeout=60, follow_redirects=True)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        schedules: list[RawSchedule] = []
        current_department = ""

        for table_index, table in enumerate(soup.find_all("table"), start=1):
            rows = table.find_all("tr")
            if not rows:
                continue
            table_text = compact(table.get_text(" ", strip=True))
            if table_text in SKIP_TABLE_LABELS or "門診看診時間" in table_text:
                continue

            for row_index, row in enumerate(rows, start=1):
                cells = [compact(cell.get_text(" ", strip=True)) for cell in row.find_all(["th", "td"])]
                if not cells or cells[0] == "科別":
                    continue

                parsed = parse_schedule_row(cells, current_department)
                if not parsed:
                    continue
                department, period, weekday_cells = parsed
                current_department = department

                for weekday, weekday_label, raw_cell in weekday_cells:
                    for doctor_name, note in extract_doctors(raw_cell):
                        schedules.append(
                            RawSchedule(
                                hospital_id=self.source.id,
                                hospital_name=self.source.hospital_name,
                                branch_name=self.source.branch_name,
                                department=department,
                                doctor_name=doctor_name,
                                weekday=weekday,
                                weekday_label=weekday_label,
                                period=period,
                                room="未標示",
                                source_url=self.source.schedule_url,
                                source_ref=f"html_table:{table_index};row:{row_index};weekday:{weekday_label}",
                                confidence=0.93,
                                note=note,
                                raw_text=raw_cell,
                            )
                        )

        return dedupe_schedules(schedules)


def parse_schedule_row(
    cells: list[str],
    current_department: str,
) -> tuple[str, str, list[tuple[int, str, str]]] | None:
    if len(cells) >= 8:
        department = cells[0]
        period = PERIOD_ALIASES.get(cells[1])
        day_values = cells[2:8]
    elif len(cells) >= 7 and current_department:
        department = current_department
        period = PERIOD_ALIASES.get(cells[0])
        day_values = cells[1:7]
    else:
        return None

    if not department or not period:
        return None

    weekday_cells: list[tuple[int, str, str]] = []
    for index, raw_cell in enumerate(day_values[:6], start=1):
        if raw_cell:
            weekday_cells.append((index, WEEKDAY_LABELS[index - 1], raw_cell))
    return department, period, weekday_cells


def extract_doctors(raw_cell: str) -> list[tuple[str, str]]:
    text = compact(raw_cell)
    if not text:
        return []

    parts = re.split(r"[、,，/]+", text)
    doctors: list[tuple[str, str]] = []
    for part in parts:
        part = compact(part)
        if not part:
            continue
        match = DOCTOR_NAME_PATTERN.match(part)
        if not match:
            continue
        doctor_name = match.group(0)
        note = compact(part[match.end():])
        note = re.sub(r"^\s*[-:：]?\s*", "", note)
        doctors.append((doctor_name, note))
    return doctors


def dedupe_schedules(items: list[RawSchedule]) -> list[RawSchedule]:
    seen: set[tuple[str, str, int, str, str]] = set()
    deduped: list[RawSchedule] = []
    for item in items:
        key = (item.department, item.doctor_name, item.weekday, item.period, item.raw_text)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def compact(text: str) -> str:
    return " ".join(text.replace("\u3000", " ").split())
