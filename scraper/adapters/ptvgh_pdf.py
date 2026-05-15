from __future__ import annotations

import base64
import hashlib
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from urllib.parse import parse_qs, urljoin, urlparse

import fitz
import httpx
from bs4 import BeautifulSoup

from adapters.base import RawSchedule, ScheduleAdapter


PDF_LINK_KEYWORD = "Download.ashx"
WEEKDAY_COLUMNS = [
    (1, "星期一", 5),
    (2, "星期二", 6),
    (3, "星期三", 7),
    (4, "星期四", 8),
    (5, "星期五", 9),
    (6, "星期六", 10),
]
DOCTOR_PATTERN = re.compile(r"([\u4e00-\u9fff]{2,5})\s*(?:[O0]?\d{3,4})")
NOTE_PATTERN = re.compile(r"[（(]\s*([^）)]+?)\s*[）)]")
VALID_PERIODS = {"上午", "下午", "晚上", "夜診", "黃昏"}


@dataclass(frozen=True)
class SourcePdf:
    title: str
    url: str
    month: int
    source_month: str


class PtvghPdfAdapter(ScheduleAdapter):
    def fetch(self) -> list[RawSchedule]:
        fetched_at = datetime.now(UTC).isoformat()
        source_pdf = latest_pdf(self.source.schedule_url)
        pdf_bytes = download(source_pdf.url)
        file_hash = hashlib.sha256(pdf_bytes).hexdigest()
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
        schedules: list[RawSchedule] = []

        for page_index in range(len(document)):
            page = document[page_index]
            for row_index, row in enumerate(extract_table_rows(page)):
                schedules.extend(
                    parse_table_row(
                        source=self.source,
                        row=row,
                        row_index=row_index,
                        page_number=page_index + 1,
                        source_pdf=source_pdf,
                        file_hash=file_hash,
                        fetched_at=fetched_at,
                    )
                )

        return dedupe(schedules)


def latest_pdf(page_url: str) -> SourcePdf:
    response = httpx.get(page_url, timeout=30, verify=False)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    candidates: list[SourcePdf] = []
    for anchor in soup.find_all("a", href=True):
        href = urljoin(page_url, anchor["href"])
        if PDF_LINK_KEYWORD not in href or ".pdf" not in href.lower():
            continue
        title = decoded_download_name(href) or anchor.get_text(" ", strip=True)
        month_match = re.search(r"(\d{1,2})\s*月", title)
        if not month_match:
            continue
        month = int(month_match.group(1))
        candidates.append(
            SourcePdf(
                title=title,
                url=href,
                month=month,
                source_month=f"115年{month}月",
            )
        )

    if not candidates:
        raise RuntimeError("找不到屏東榮總門診 PDF。")
    return max(candidates, key=lambda item: item.month)


def decoded_download_name(url: str) -> str:
    query = parse_qs(urlparse(url).query)
    value = query.get("n", [""])[0]
    if not value:
        return ""
    try:
        return base64.b64decode(value).decode("utf-8")
    except Exception:
        return ""


def download(url: str) -> bytes:
    response = httpx.get(url, timeout=60, verify=False)
    response.raise_for_status()
    return response.content


def extract_table_rows(page: fitz.Page) -> list[list[str]]:
    tables = page.find_tables()
    if not tables.tables:
        raise RuntimeError("屏東榮總 PDF 找不到表格。")
    table = max(tables.tables, key=lambda item: len(item.extract()))
    return [[cell or "" for cell in row] for row in table.extract()]


def parse_table_row(
    source,
    row: list[str],
    row_index: int,
    page_number: int,
    source_pdf: SourcePdf,
    file_hash: str,
    fetched_at: str,
) -> list[RawSchedule]:
    department = clean_cell(row[1] if len(row) > 1 else "")
    period = normalize_period(clean_cell(row[3] if len(row) > 3 else ""))
    room = clean_cell(row[4] if len(row) > 4 else "")
    if not department or not period:
        return []
    if is_category_row(department):
        return []

    schedules: list[RawSchedule] = []
    for weekday, weekday_label, column_index in WEEKDAY_COLUMNS:
        cell = clean_cell(row[column_index] if len(row) > column_index else "")
        if not cell:
            continue
        for doctor_name, note in extract_doctors(cell):
            schedules.append(
                RawSchedule(
                    hospital_id=source.id,
                    hospital_name=source.hospital_name,
                    branch_name=source.branch_name,
                    department=department,
                    doctor_name=doctor_name,
                    weekday=weekday,
                    weekday_label=weekday_label,
                    period=period,
                    room=room,
                    source_url=source.schedule_url,
                    source_ref=f"{source_pdf.title} p{page_number} row{row_index + 1}",
                    confidence=0.98,
                    note=note,
                    raw_text=cell,
                    source_page=page_number,
                    source_file_url=source_pdf.url,
                    file_hash=file_hash,
                    source_type="pdf-table",
                    source_month=source_pdf.source_month,
                    fetched_at=fetched_at,
                )
            )
    return schedules


def clean_cell(value: str) -> str:
    return " ".join(value.replace("\u3000", " ").split())


def normalize_period(value: str) -> str:
    if value == "晚上":
        return "夜診"
    return value if value in VALID_PERIODS else ""


def is_category_row(value: str) -> bool:
    compact = value.replace(" ", "")
    return compact in {"內科", "外科", "其他科"} or len(compact) <= 1


def extract_doctors(cell: str) -> list[tuple[str, str]]:
    note = "、".join(clean_cell(item) for item in NOTE_PATTERN.findall(cell))
    doctors: list[tuple[str, str]] = []
    seen: set[str] = set()
    for match in DOCTOR_PATTERN.finditer(cell):
        name = normalize_doctor_name(match.group(1))
        if not name or name in seen:
            continue
        seen.add(name)
        doctors.append((name, note))
    return doctors


def normalize_doctor_name(name: str) -> str:
    clean = re.sub(r"[^\u4e00-\u9fff]", "", name)
    if len(clean) < 2 or len(clean) > 5:
        return ""
    if clean.startswith("星期"):
        return ""
    if clean in {"起看診", "全日停診"}:
        return ""
    return clean


def dedupe(items: list[RawSchedule]) -> list[RawSchedule]:
    seen: set[tuple[str, str, int, str, str]] = set()
    unique: list[RawSchedule] = []
    for item in items:
        key = (item.department, item.doctor_name, item.weekday, item.period, item.room)
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique

