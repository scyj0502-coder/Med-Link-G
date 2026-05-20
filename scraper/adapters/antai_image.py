from __future__ import annotations

import hashlib
import io
import os
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Callable
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from PIL import Image

from adapters.base import RawSchedule, ScheduleAdapter
from adapters.edah_pdf import ocr_image


IMAGE_PATTERN = re.compile(r"/images-1003/(\d{6})-(\d+)\.jpg$", re.IGNORECASE)
CELL_DOCTOR_PATTERN = re.compile(r"([\u4e00-\u9fff]{2,4})([A-Z]\d{1,2})(?:\d)?(?:診|誌|認|詰)?")
NOTE_PATTERN = re.compile(r"[（(]([^（）()]{2,30})[）)]")


@dataclass(frozen=True)
class SourceImage:
    url: str
    source_month: str
    page_number: int
    file_hash: str = ""
    raw_text: str = ""


@dataclass(frozen=True)
class TableGrid:
    x_lines: list[int]
    y_lines: list[int]


@dataclass(frozen=True)
class Box:
    left: int
    top: int
    right: int
    bottom: int


@dataclass(frozen=True)
class ScheduleColumn:
    weekday: int
    weekday_label: str
    period: str
    left: int
    right: int


@dataclass(frozen=True)
class CellDoctor:
    doctor_name: str
    room: str
    note: str
    raw_text: str


@dataclass(frozen=True)
class RowContext:
    department: str
    location: str
    top: int
    bottom: int


@dataclass(frozen=True)
class ScheduleCell:
    column: ScheduleColumn
    row_context: RowContext
    box: Box


class AntaiImageAdapter(ScheduleAdapter):
    """Antai publishes schedule pages as images embedded in an HTML page.

    The adapter intentionally discovers the image URLs from the page at run
    time. OCR table parsing is kept conservative because the current source is
    a dense newsletter-style image and should not overwrite trusted schedules
    until row/column extraction is proven.
    """

    def fetch(self) -> list[RawSchedule]:
        if os.environ.get("ANTAI_IMAGE_PUBLISH") != "1":
            return []

        fetched_at = datetime.now(UTC).isoformat()
        images = discover_latest_images(self.source.schedule_url)
        schedules: list[RawSchedule] = []
        for image_ref in images:
            image_bytes = download(image_ref.url)
            file_hash = hashlib.sha256(image_bytes).hexdigest()
            image = Image.open(io.BytesIO(image_bytes))
            schedules.extend(
                parse_image_table(
                    source=self.source,
                    image=image,
                    image_ref=SourceImage(
                        url=image_ref.url,
                        source_month=image_ref.source_month,
                        page_number=image_ref.page_number,
                        file_hash=file_hash,
                    ),
                    fetched_at=fetched_at,
                )
            )
        return schedules


def discover_latest_images(page_url: str) -> list[SourceImage]:
    response = httpx.get(page_url, timeout=30, verify=False)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    images: dict[tuple[str, int], SourceImage] = {}
    for tag in soup.find_all(["img", "a"]):
        href = tag.get("src") or tag.get("href")
        if not href:
            continue
        full_url = urljoin(page_url, href)
        match = IMAGE_PATTERN.search(full_url)
        if not match:
            continue
        month_code, page_number = match.groups()
        images[(month_code, int(page_number))] = SourceImage(
            url=full_url.replace("https://", "http://"),
            source_month=f"{month_code[:4]}-{month_code[4:]}",
            page_number=int(page_number),
        )

    if not images:
        raise RuntimeError("找不到安泰醫院門診圖片。")

    latest_month = max(month for month, _ in images)
    return [
        image
        for (month, _), image in sorted(images.items(), key=lambda item: item[0][1])
        if month == latest_month
    ]


def download(url: str) -> bytes:
    response = httpx.get(url, timeout=60, verify=False)
    response.raise_for_status()
    return response.content


def preview_crop(image: Image.Image) -> Image.Image:
    """Keep OCR bounded while this source is in validation mode."""
    if image.height <= 1800:
        return image
    return image.crop((0, 0, image.width, 1800))


def detect_table_grid(image: Image.Image) -> TableGrid:
    grayscale = image.convert("L")
    width, height = grayscale.size
    pixels = grayscale.load()

    x_scan_top = max(0, round(height * 0.07))
    x_scan_bottom = max(x_scan_top + 1, height - round(height * 0.04))
    y_scan_left = max(0, round(width * 0.015))
    y_scan_right = max(y_scan_left + 1, width - round(width * 0.015))

    x_threshold = max(80, round((x_scan_bottom - x_scan_top) * 0.18))
    y_threshold = max(80, round((y_scan_right - y_scan_left) * 0.48))

    x_candidates = []
    for x in range(width):
        dark_count = sum(1 for y in range(x_scan_top, x_scan_bottom) if pixels[x, y] < 80)
        if dark_count >= x_threshold:
            x_candidates.append(x)

    y_candidates = []
    for y in range(height):
        dark_count = sum(1 for x in range(y_scan_left, y_scan_right) if pixels[x, y] < 80)
        if dark_count >= y_threshold:
            y_candidates.append(y)

    return TableGrid(
        x_lines=merge_positions(x_candidates),
        y_lines=merge_positions(y_candidates),
    )


def merge_positions(values: list[int], gap: int = 3) -> list[int]:
    groups: list[list[int]] = []
    for value in values:
        if not groups or value - groups[-1][-1] > gap:
            groups.append([value])
        else:
            groups[-1].append(value)
    return [round((group[0] + group[-1]) / 2) for group in groups]


def schedule_columns(grid: TableGrid) -> list[ScheduleColumn]:
    data_edges = schedule_column_edges(grid)
    if len(data_edges) < 17:
        return []

    periods = [
        (1, "星期一", "上午"),
        (1, "星期一", "下午"),
        (1, "星期一", "夜診"),
        (2, "星期二", "上午"),
        (2, "星期二", "下午"),
        (2, "星期二", "夜診"),
        (3, "星期三", "上午"),
        (3, "星期三", "下午"),
        (3, "星期三", "夜診"),
        (4, "星期四", "上午"),
        (4, "星期四", "下午"),
        (4, "星期四", "夜診"),
        (5, "星期五", "上午"),
        (5, "星期五", "下午"),
        (5, "星期五", "夜診"),
        (6, "星期六", "上午"),
    ]

    return [
        ScheduleColumn(
            weekday=weekday,
            weekday_label=weekday_label,
            period=period,
            left=data_edges[index],
            right=data_edges[index + 1],
        )
        for index, (weekday, weekday_label, period) in enumerate(periods)
    ]


def schedule_column_edges(grid: TableGrid) -> list[int]:
    """Find the 17 vertical edges that bound the 16 weekday/session columns.

    OCR source images contain vertical strokes inside left-side labels, so the
    detected x-lines cannot be used by index alone. The schedule area is the
    first run of 17 mostly even-spaced vertical table lines.
    """
    line_count = 17
    if len(grid.x_lines) < line_count:
        return []

    for start in range(0, len(grid.x_lines) - line_count + 1):
        edges = grid.x_lines[start : start + line_count]
        if edges[0] < 250:
            continue
        widths = [right - left for left, right in zip(edges, edges[1:])]
        if not widths:
            continue
        median_width = sorted(widths)[len(widths) // 2]
        if median_width < 40:
            continue
        if min(widths) < median_width * 0.65:
            continue
        if max(widths) > median_width * 1.45:
            continue
        return edges
    return []


def data_row_ranges(grid: TableGrid) -> list[tuple[int, int]]:
    if len(grid.y_lines) <= 3:
        return []
    data_edges = grid.y_lines[3:]
    return [
        (top, bottom)
        for top, bottom in zip(data_edges, data_edges[1:])
        if bottom - top >= 18
    ]


def left_context_boxes(grid: TableGrid, row_range: tuple[int, int]) -> tuple[Box, Box]:
    """Return the department and location boxes for an Antai table row."""
    schedule_edges = schedule_column_edges(grid)
    if len(grid.x_lines) < 3 or not schedule_edges:
        empty = Box(0, row_range[0], 0, row_range[1])
        return empty, empty

    top, bottom = row_range
    department_left = grid.x_lines[1]
    department_right = next((x for x in grid.x_lines if x > department_left + 60), grid.x_lines[2])
    schedule_left = schedule_edges[0]
    department_box = Box(department_left, top, department_right, bottom)
    location_box = Box(department_right, top, schedule_left, bottom)
    return department_box, location_box


def normalize_context_text(raw_text: str) -> str:
    return re.sub(r"\s+", "", raw_text.replace("\u3000", ""))


def row_context_from_text(
    department_text: str,
    location_text: str,
    row_range: tuple[int, int],
    previous: RowContext | None = None,
) -> RowContext:
    department = normalize_context_text(department_text)
    location = normalize_context_text(location_text)
    if previous:
        department = department or previous.department
        location = location or previous.location
    return RowContext(department=department, location=location, top=row_range[0], bottom=row_range[1])


def schedule_cell_boxes(grid: TableGrid, row_contexts: list[RowContext]) -> list[ScheduleCell]:
    columns = schedule_columns(grid)
    cells: list[ScheduleCell] = []
    for row_context in row_contexts:
        for column in columns:
            cells.append(
                ScheduleCell(
                    column=column,
                    row_context=row_context,
                    box=Box(
                        left=column.left,
                        top=row_context.top,
                        right=column.right,
                        bottom=row_context.bottom,
                    ),
                )
            )
    return cells


def ocr_box(image: Image.Image, box: Box, ocr: Callable[[Image.Image], str] | None = None) -> str:
    if box.right <= box.left or box.bottom <= box.top:
        return ""
    crop = image.crop((box.left, box.top, box.right, box.bottom))
    crop = crop.resize((max(1, crop.width * 3), max(1, crop.height * 3)))
    if ocr is None:
        return ocr_image(crop, psm="6")
    return ocr(crop)


def read_row_contexts(
    image: Image.Image,
    grid: TableGrid,
    ocr: Callable[[Image.Image], str] | None = None,
) -> list[RowContext]:
    contexts: list[RowContext] = []
    previous: RowContext | None = None
    for row_range in data_row_ranges(grid):
        department_box, location_box = left_context_boxes(grid, row_range)
        context = row_context_from_text(
            department_text=ocr_box(image, department_box, ocr),
            location_text=ocr_box(image, location_box, ocr),
            row_range=row_range,
            previous=previous,
        )
        contexts.append(context)
        previous = context
    return contexts


def parse_image_table(
    source,
    image: Image.Image,
    image_ref: SourceImage,
    fetched_at: str,
    ocr: Callable[[Image.Image], str] | None = None,
) -> list[RawSchedule]:
    grid = detect_table_grid(image)
    row_contexts = read_row_contexts(image, grid, ocr)
    cell_texts = [(cell, ocr_box(image, cell.box, ocr)) for cell in schedule_cell_boxes(grid, row_contexts)]
    return build_schedules_from_cells(source, image_ref, fetched_at, cell_texts)


def extract_cell_doctors(raw_text: str) -> list[CellDoctor]:
    compact = normalize_cell_text(raw_text)
    if not compact:
        return []
    note = "；".join(dict.fromkeys(match.strip() for match in NOTE_PATTERN.findall(raw_text) if match.strip()))
    doctors: list[CellDoctor] = []
    seen: set[tuple[str, str]] = set()
    for match in CELL_DOCTOR_PATTERN.finditer(compact):
        doctor_name = match.group(1)
        room = f"{match.group(2)}診"
        key = (doctor_name, room)
        if key in seen:
            continue
        seen.add(key)
        doctors.append(CellDoctor(doctor_name=doctor_name, room=room, note=note, raw_text=raw_text))
    return doctors


def normalize_cell_text(raw_text: str) -> str:
    return (
        raw_text.upper()
        .replace("\u3000", "")
        .replace(" ", "")
        .replace("\n", "")
        .replace("０", "0")
        .replace("１", "1")
        .replace("２", "2")
        .replace("３", "3")
        .replace("４", "4")
        .replace("５", "5")
        .replace("６", "6")
        .replace("７", "7")
        .replace("８", "8")
        .replace("９", "9")
        .replace("Ｃ", "C")
        .replace("Ａ", "A")
        .replace("Ｂ", "B")
    )


def build_schedules_from_cells(
    source,
    image_ref: SourceImage,
    fetched_at: str,
    cell_texts: list[tuple[ScheduleCell, str]],
) -> list[RawSchedule]:
    schedules: list[RawSchedule] = []
    for cell, raw_text in cell_texts:
        if not cell.row_context.department:
            continue
        for doctor in extract_cell_doctors(raw_text):
            notes = [doctor.note]
            if cell.row_context.location:
                notes.append(f"地點：{cell.row_context.location}")
            schedules.append(
                RawSchedule(
                    hospital_id=source.id,
                    hospital_name=source.hospital_name,
                    branch_name=source.branch_name,
                    department=cell.row_context.department,
                    doctor_name=doctor.doctor_name,
                    weekday=cell.column.weekday,
                    weekday_label=cell.column.weekday_label,
                    period=cell.column.period,
                    room=doctor.room,
                    source_url=source.schedule_url,
                    source_ref=f"{image_ref.source_month}-p{image_ref.page_number}",
                    source_file_url=image_ref.url,
                    file_hash=image_ref.file_hash,
                    confidence=0.72,
                    note="；".join(note for note in notes if note),
                    raw_text=doctor.raw_text,
                    source_page=image_ref.page_number,
                    source_type="image",
                    source_month=image_ref.source_month,
                    fetched_at=fetched_at,
                )
            )
    return schedules


def parse_ocr_text(source, image_ref: SourceImage, fetched_at: str) -> list[RawSchedule]:
    # Kept for backward compatibility with earlier validation scripts. Antai is
    # parsed through parse_image_table so OCR text order is never trusted alone.
    _ = (source, image_ref, fetched_at)
    return []
