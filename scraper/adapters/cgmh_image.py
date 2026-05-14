from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import fitz
import httpx
from PIL import Image

from adapters.base import RawSchedule, ScheduleAdapter
from adapters.edah_pdf import ocr_base_crop


WEEKDAY_COLUMNS = [
    (1, "星期一", 269, 397),
    (2, "星期二", 397, 524),
    (3, "星期三", 524, 652),
    (4, "星期四", 652, 780),
    (5, "星期五", 780, 907),
    (6, "星期六", 907, 1035),
]
DEPARTMENT_BOX = (89, 0, 225, 0)
SHIFT_BOX = (225, 0, 269, 0)
TABLE_X_RANGE = (89, 1035)
DOCTOR_PATTERN = re.compile(r"[#＃◎▲△※]?\s*(?:[A-Z]?\d{4,5}|J\d{4}|[A-Z]\d{4})\s*([\u4e00-\u9fff]{2,4})")
NOTE_PATTERN = re.compile(r"[（(]([^（）()]{2,30})[）)]")
VALID_SHIFTS = {"上午", "下午", "夜間", "夜診", "晚上"}
DOCTOR_CORRECTIONS = {
    "蔡褲晏": "蔡青晏",
    "鄭又說": "鄭又誠",
    "漏柏霓": "潘柏霖",
    "張晃舀": "張晃智",
    "張國錮": "張國欽",
    "噌雅文": "蕭雅文",
    "郴仲課": "郭仲謙",
}
IGNORED_DOCTOR_NAMES = {"詮周", "訴唱", "診陶", "誥腕", "誌唱", "詮咐"}
KNOWN_DEPARTMENTS = [
    "一般內科",
    "胃腸肝膽科",
    "胸腔內科",
    "血液腫瘤科",
    "腎臟科",
    "內分泌暨新陳代謝科",
    "心臟內科",
    "神經內科",
    "家醫科",
    "感染科",
    "一般外科",
    "骨科",
    "泌尿科",
    "婦產科",
    "耳鼻喉科",
    "眼科",
    "皮膚科",
    "精神科",
    "復健科",
    "牙科",
]
PAGE_SEGMENT_DEPARTMENTS = {
    2: ["一般內科", "胃腸肝膽科", "胸腔內科", "血液腫瘤科", "腎臟科", "內分泌暨新陳代謝科"],
}
PAGE_SHIFT_SPANS = {
    2: [
        (314, 465, "上午"),
        (465, 610, "下午"),
        (610, 685, "夜診"),
        (743, 769, "上午"),
        (769, 849, "下午"),
        (849, 873, "夜診"),
        (935, 962, "上午"),
        (962, 1014, "下午"),
        (1014, 1043, "夜診"),
        (1076, 1131, "上午"),
        (1131, 1188, "下午"),
        (1221, 1275, "上午"),
        (1275, 1328, "下午"),
        (1366, 1390, "上午"),
        (1390, 1409, "下午"),
    ],
}


@dataclass(frozen=True)
class RowContext:
    top: int
    bottom: int
    department: str
    shift: str


class CgmhImageAdapter(ScheduleAdapter):
    def fetch(self) -> list[RawSchedule]:
        response = httpx.get(self.source.schedule_url, timeout=90, follow_redirects=True)
        response.raise_for_status()
        doc = fitz.open(stream=response.content, filetype="pdf")

        items: list[RawSchedule] = []
        parsed_at = datetime.now(UTC).isoformat()
        for page_index, page in enumerate(doc, start=1):
            if page_index not in PAGE_SEGMENT_DEPARTMENTS:
                continue
            image = render_page(page)
            row_edges = detect_row_edges(image)
            if len(row_edges) < 4:
                continue
            items.extend(parse_page_rows(self.source, image, row_edges, page_index, parsed_at))
        return dedupe(items)


def render_page(page: fitz.Page) -> Image.Image:
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    return Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)


def detect_row_edges(image: Image.Image) -> list[int]:
    gray = image.convert("L")
    width, height = gray.size
    left = round(TABLE_X_RANGE[0] * width / 1080)
    right = round(TABLE_X_RANGE[1] * width / 1080)
    threshold = 145
    minimum_dark_pixels = max(90, round((right - left) * 0.58))
    ys: list[int] = []
    for y in range(round(170 * height / 1289), min(height - 25, round(1210 * height / 1289))):
        dark = sum(1 for x in range(left, right) if gray.getpixel((x, y)) < threshold)
        if dark >= minimum_dark_pixels:
            ys.append(y)

    groups: list[list[int]] = []
    for y in ys:
        if not groups or y - groups[-1][-1] > 2:
            groups.append([y])
        else:
            groups[-1].append(y)

    scale = 1080 / width
    edges = [round((group[0] + group[-1]) / 2 * scale) for group in groups]
    return [edge for edge in edges if 170 <= edge <= 1450]


def parse_page_rows(
    source,
    image: Image.Image,
    row_edges: list[int],
    page_number: int,
    parsed_at: str,
) -> list[RawSchedule]:
    items: list[RawSchedule] = []
    for segment_index, (segment_top, segment_bottom) in enumerate(table_segments(image, row_edges)):
        current_department = segment_department(image, page_number, segment_index, segment_top, segment_bottom)
        current_shift = ""
        for top, bottom in zip(
            [edge for edge in row_edges if segment_top <= edge < segment_bottom],
            [edge for edge in row_edges if segment_top < edge <= segment_bottom],
        ):
            if bottom - top < 16:
                continue
            shift = shift_for_row(page_number, top, bottom) or normalize_shift(ocr_cached(image, (SHIFT_BOX[0], top, SHIFT_BOX[2], bottom), psm="6"))
            if shift:
                current_shift = shift
            if not current_department or not current_shift:
                continue
            if current_department in {"科別", "內科", "外科"}:
                continue

            context = RowContext(top=top, bottom=bottom, department=current_department, shift=current_shift)
            for weekday, weekday_label, left, right in WEEKDAY_COLUMNS:
                raw_text = ocr_cached(image, (left, top, right, bottom), psm="6")
                doctors = extract_doctors(raw_text)
                for doctor_name, note in doctors:
                    items.append(
                        RawSchedule(
                            hospital_id=source.id,
                            hospital_name=source.hospital_name,
                            branch_name=source.branch_name,
                            department=context.department,
                            doctor_name=doctor_name,
                            weekday=weekday,
                            weekday_label=weekday_label,
                            period=context.shift,
                            room=department_room(context.department),
                            source_url=source.schedule_url,
                            source_ref=f"pdf_page:{page_number};row:{top}-{bottom};weekday:{weekday_label}",
                            confidence=0.86,
                            note=note,
                            raw_text=raw_text,
                            source_page=page_number,
                            parsed_at=parsed_at,
                        )
                    )
    return items


def table_segments(image: Image.Image, row_edges: list[int]) -> list[tuple[int, int]]:
    headers: list[tuple[int, int]] = []
    for top, bottom in zip(row_edges, row_edges[1:]):
        if bottom - top < 16:
            continue
        header_text = "".join(
            ocr_cached(image, (left, top, right, bottom), psm="6")
            for _, _, left, right in WEEKDAY_COLUMNS[:3]
        )
        header_text = re.sub(r"\s+", "", header_text)
        if "星期" in header_text or "期一" in header_text:
            headers.append((top, bottom))

    segments: list[tuple[int, int]] = []
    for index, (_, start) in enumerate(headers):
        end = headers[index + 1][0] - 2 if index + 1 < len(headers) else row_edges[-1]
        if end - start >= 35:
            segments.append((start, end))
    return segments


def segment_department(image: Image.Image, page_number: int, segment_index: int, top: int, bottom: int) -> str:
    manual_departments = PAGE_SEGMENT_DEPARTMENTS.get(page_number)
    if manual_departments and segment_index < len(manual_departments):
        return manual_departments[segment_index]
    raw = ocr_cached(image, (DEPARTMENT_BOX[0], top, DEPARTMENT_BOX[2], bottom), psm="6")
    return normalize_department(raw)


def shift_for_row(page_number: int, top: int, bottom: int) -> str:
    mid = round((top + bottom) / 2)
    for span_top, span_bottom, shift in PAGE_SHIFT_SPANS.get(page_number, []):
        if span_top <= mid < span_bottom:
            return shift
    return ""


def ocr_cached(image: Image.Image, box: tuple[int, int, int, int], psm: str) -> str:
    cache_root = Path("data/ocr-cache/cgmh-image")
    cache_root.mkdir(parents=True, exist_ok=True)
    crop = image.crop(tuple(round(value * image.width / 1080) for value in box))
    key = hashlib.sha1()
    key.update(str((box, psm, crop.size)).encode("utf-8"))
    key.update(crop.tobytes())
    path = cache_root / f"{key.hexdigest()}.txt"
    if path.exists():
        return path.read_text(encoding="utf-8", errors="ignore")
    text = ocr_base_crop(image, box, psm=psm)
    path.write_text(text, encoding="utf-8")
    return text


def normalize_department(text: str) -> str:
    compact = re.sub(r"\s+", "", text)
    compact = re.sub(r"[^\u4e00-\u9fffA-Za-z0-9]", "", compact)
    for department in KNOWN_DEPARTMENTS:
        if department in compact:
            return department
    compact = compact.replace("三樓胸腔內科診區", "")
    compact = compact.replace("地下樓內科診區", "")
    compact = compact.replace("科別", "")
    if len(compact) > 18:
        compact = compact[:18]
    return compact


def normalize_shift(text: str) -> str:
    compact = re.sub(r"\s+", "", text)
    if "上午" in compact:
        return "上午"
    if "下午" in compact:
        return "下午"
    if "夜" in compact or "晚" in compact:
        return "夜診"
    return ""


def department_room(department: str) -> str:
    if "胸腔內科" in department:
        return "三樓胸腔內科診區"
    if any(token in department for token in ["一般內科", "胃腸肝膽科", "血液腫瘤科", "腎臟科", "內分泌"]):
        return "地下樓內科診區"
    return "依現場診區"


def extract_doctors(text: str) -> list[tuple[str, str]]:
    raw = text.replace("\n", " ")
    compact = re.sub(r"\s+", "", raw)
    note = "；".join(dict.fromkeys(match.strip() for match in NOTE_PATTERN.findall(raw) if match.strip()))
    doctors: list[tuple[str, str]] = []
    seen: set[str] = set()
    for match in DOCTOR_PATTERN.finditer(compact):
        name = normalize_doctor_name(match.group(1))
        if not name or name in seen:
            continue
        seen.add(name)
        doctors.append((name, note))
    return doctors


def normalize_doctor_name(name: str) -> str:
    clean = re.sub(r"[^\u4e00-\u9fff]", "", name)
    clean = DOCTOR_CORRECTIONS.get(clean, clean)
    if len(clean) < 2 or len(clean) > 4:
        return ""
    if clean in IGNORED_DOCTOR_NAMES:
        return ""
    if any(token in clean for token in ["診區", "診間", "上午", "下午", "夜間"]):
        return ""
    return clean


def dedupe(items: list[RawSchedule]) -> list[RawSchedule]:
    seen: set[tuple[str, str, str, int, str, str]] = set()
    unique: list[RawSchedule] = []
    for item in items:
        key = (item.hospital_id, item.department, item.doctor_name, item.weekday, item.period, item.raw_text)
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique
