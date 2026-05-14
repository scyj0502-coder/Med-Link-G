from __future__ import annotations

import io
import re
from dataclasses import dataclass
from urllib.parse import urljoin

import fitz
import httpx
from bs4 import BeautifulSoup
from PIL import Image
from PIL import ImageEnhance
from PIL import ImageOps

from adapters.base import RawSchedule, ScheduleAdapter
from adapters.edah_pdf import ocr_base_crop


LIST_URL = "https://www.pntn.mohw.gov.tw/?aid=602&iid=2"
WEEKDAY_COLUMNS = [
    (1, "星期一", 308, 424),
    (2, "星期二", 424, 539),
    (3, "星期三", 539, 654),
    (4, "星期四", 654, 769),
    (5, "星期五", 769, 884),
    (6, "星期六", 884, 1002),
]
LEFT_COLUMNS = {
    "department": (68, 154),
    "shift": (154, 206),
    "location": (206, 257),
    "room": (257, 308),
}
TABLE_X_RANGE = (60, 1015)
TABLE_Y_RANGE = (130, 1490)
DOCTOR_PATTERN = re.compile(r"([\u4e00-\u9fff]{2,5})\s*(?:[O0]?\d{3,4})")
NOTE_PATTERN = re.compile(r"[（(]([^）)]+)[）)]")
SHIFT_SEQUENCE = ["上午", "下午", "黃昏"]


DEPARTMENT_ALIASES = {
    "一般科": ["一般科"],
    "神經科": ["神經科", "神內經科", "神內", "經科"],
    "心臟科": ["心臟科", "心內臟科", "心內"],
    "肝膽胰腸胃內科": ["肝膽胰腸胃內科", "肝膽胰", "腸胃內科"],
    "營養諮詢": ["營養諮詢", "營養"],
    "內分泌新陳代謝科": ["內分泌新陳代謝科", "新陳代謝科"],
    "胸腔內科": ["胸腔內科", "胸腔內"],
    "感染科": ["感染科"],
    "腎臟內科": ["腎臟內科", "腎臟內"],
    "腫瘤科": ["腫瘤科"],
    "血液科": ["血液科"],
    "家醫科": ["家醫科"],
    "職業醫學科": ["職業醫學科"],
    "一般消化外科": ["一般消化外科", "一般及消化外科", "消化外科"],
    "乳房外科": ["乳房外科"],
    "大腸直腸肛門外科": ["大腸直腸肛門外科", "大腸直腸", "肛門外科"],
    "泌尿科": ["泌尿科"],
}
PAGE_DEPARTMENT_SPANS = {
    1: [
        (198, 400, "一般科"),
        (400, 669, "神經科"),
        (669, 939, "心臟科"),
        (939, 1208, "肝膽胰腸胃內科"),
        (1208, 1276, "營養諮詢"),
        (1276, 1478, "內分泌新陳代謝科"),
    ],
    2: [
        (196, 578, "胸腔內科"),
        (578, 770, "感染科"),
        (770, 1025, "腎臟內科"),
        (1025, 1152, "腫瘤科"),
        (1152, 1407, "家醫科"),
        (1407, 1470, "職業醫學科"),
    ],
    3: [
        (198, 629, "一般消化外科"),
        (629, 1138, "乳房外科"),
        (1138, 1467, "泌尿科"),
    ],
    4: [
        (195, 684, "骨科"),
        (684, 868, "神經外科"),
        (868, 1052, "心臟血管外科"),
        (1052, 1235, "整形外科"),
        (1235, 1472, "胸腔外科"),
    ],
    5: [
        (195, 378, "兒科"),
        (378, 562, "婦產科"),
        (562, 684, "婦癌專科"),
        (684, 868, "耳鼻喉科"),
        (868, 990, "眼科"),
        (990, 1472, "牙科"),
    ],
    6: [
        (195, 379, "皮膚科"),
        (379, 623, "精神科"),
        (623, 746, "替代療法"),
        (746, 990, "復健科"),
        (990, 1327, "戒菸特別門診"),
        (1327, 1470, "M痘疫苗"),
    ],
}


@dataclass
class RowContext:
    department: str = ""
    shift: str = ""
    location: str = ""
    room: str = ""


class PingtungMohwAdapter(ScheduleAdapter):
    """Parse Pingtung Hospital's scanned PDF with fixed table coordinates."""

    def fetch(self) -> list[RawSchedule]:
        pdf_url = latest_pdf_url(self.source.schedule_url)
        pdf_bytes = httpx.get(pdf_url, timeout=60, follow_redirects=True).content
        document = fitz.open(stream=pdf_bytes, filetype="pdf")

        schedules: list[RawSchedule] = []
        for page_index in range(len(document)):
            page = document[page_index]
            base_image = render_page(page, scale=2)
            ocr_image = render_page(page, scale=4)
            row_edges = detect_horizontal_grid_lines(base_image)
            if len(row_edges) < 3:
                continue

            shift_spans = detect_shift_spans(base_image)
            for row_index, (top, bottom) in enumerate(zip(row_edges[1:], row_edges[2:]), start=1):
                if bottom - top < 25 or bottom > 1495:
                    continue
                context = context_for_row(
                    image=ocr_image,
                    page_number=page_index + 1,
                    top=top,
                    bottom=bottom,
                    shift_spans=shift_spans,
                )
                if not context.department or not context.shift:
                    continue

                for weekday, weekday_label, left, right in WEEKDAY_COLUMNS:
                    cell_text = ocr_crop(ocr_image, (left, top, right, bottom), psm="6")
                    for doctor_name, note in extract_doctors(cell_text):
                        schedules.append(
                            RawSchedule(
                                hospital_id=self.source.id,
                                hospital_name=self.source.hospital_name,
                                branch_name=self.source.branch_name,
                                department=context.department,
                                doctor_name=doctor_name,
                                weekday=weekday,
                                weekday_label=weekday_label,
                                period=context.shift,
                                room=context.room or "未標示",
                                source_url=pdf_url,
                                source_ref=f"pdf_page:{page_index + 1};row:{row_index};weekday:{weekday_label}",
                                confidence=0.87,
                                note=note,
                                raw_text=compact_text(cell_text),
                                source_page=page_index + 1,
                            )
                        )

        return dedupe(schedules)


def latest_pdf_url(source_url: str) -> str:
    if source_url.lower().endswith(".pdf"):
        return source_url
    response = httpx.get(source_url, timeout=60, follow_redirects=True)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    candidates: list[tuple[int, str]] = []
    for link in soup.find_all("a"):
        label = compact_text(link.get_text(" ", strip=True))
        href = link.get("href")
        if not href or "門診表" not in label or "pdf" not in label.lower():
            continue
        month_match = re.search(r"115年(\d+)月份", label)
        month = int(month_match.group(1)) if month_match else 0
        candidates.append((month, urljoin(source_url, href)))
    if not candidates:
        raise RuntimeError("No Pingtung Hospital schedule PDF link found.")
    return resolve_pdf_download_url(sorted(candidates, reverse=True)[0][1])


def resolve_pdf_download_url(download_page_url: str) -> str:
    response = httpx.get(download_page_url, timeout=60, follow_redirects=True)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "").lower()
    if "pdf" in content_type or response.content[:4] == b"%PDF":
        return str(response.url)
    soup = BeautifulSoup(response.text, "html.parser")
    for link in soup.find_all("a"):
        href = link.get("href") or ""
        label = compact_text(link.get_text(" ", strip=True))
        if ".pdf" in href.lower() or "pdf" in label.lower():
            return urljoin(str(response.url), href)
    raise RuntimeError("No direct PDF URL found on Pingtung Hospital download page.")


def render_page(page: fitz.Page, scale: int) -> Image.Image:
    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    return Image.open(io.BytesIO(pixmap.tobytes("png")))


def detect_horizontal_grid_lines(image: Image.Image) -> list[int]:
    red_rows: list[int] = []
    for y in range(TABLE_Y_RANGE[0], min(TABLE_Y_RANGE[1], image.height)):
        red_pixels = 0
        for x in range(TABLE_X_RANGE[0], min(TABLE_X_RANGE[1], image.width)):
            r, g, b = image.getpixel((x, y))[:3]
            if r > 150 and g < 130 and b < 150 and r > g + 40 and r > b + 40:
                red_pixels += 1
        if red_pixels > 300:
            red_rows.append(y)

    groups: list[list[int]] = []
    for y in red_rows:
        if not groups or y > groups[-1][-1] + 2:
            groups.append([])
        groups[-1].append(y)
    return [round(sum(group) / len(group)) for group in groups]


def detect_shift_spans(image: Image.Image) -> list[tuple[int, int]]:
    edges = detect_red_lines_in_column(image, LEFT_COLUMNS["shift"], threshold=25)
    return [(top, bottom) for top, bottom in zip(edges, edges[1:]) if bottom - top >= 25]


def detect_red_lines_in_column(image: Image.Image, column: tuple[int, int], threshold: int) -> list[int]:
    red_rows: list[int] = []
    left, right = column
    for y in range(TABLE_Y_RANGE[0], min(TABLE_Y_RANGE[1], image.height)):
        red_pixels = 0
        for x in range(left, right):
            r, g, b = image.getpixel((x, y))[:3]
            if r > 150 and g < 130 and b < 150 and r > g + 40 and r > b + 40:
                red_pixels += 1
        if red_pixels > threshold:
            red_rows.append(y)

    groups: list[list[int]] = []
    for y in red_rows:
        if not groups or y > groups[-1][-1] + 2:
            groups.append([])
        groups[-1].append(y)
    return [round(sum(group) / len(group)) for group in groups]


def context_for_row(
    image: Image.Image,
    page_number: int,
    top: int,
    bottom: int,
    shift_spans: list[tuple[int, int]],
) -> RowContext:
    department_span = department_span_for_row(page_number, top, bottom)
    if not department_span:
        return RowContext()
    department_top, department_bottom, department = department_span
    row_mid = (top + bottom) / 2
    spans_in_department = [
        span for span in shift_spans
        if span[0] >= department_top - 2 and span[1] <= department_bottom + 2
    ]
    shift = ""
    for index, (shift_top, shift_bottom) in enumerate(spans_in_department):
        if shift_top <= row_mid <= shift_bottom:
            shift = SHIFT_SEQUENCE[min(index, len(SHIFT_SEQUENCE) - 1)]
            break

    location_text = ocr_crop(
        image,
        (LEFT_COLUMNS["location"][0], department_top, LEFT_COLUMNS["location"][1], department_bottom),
        psm="6",
    )
    room_text = ocr_crop(image, (LEFT_COLUMNS["room"][0], top, LEFT_COLUMNS["room"][1], bottom), psm="6")
    return RowContext(
        department=department,
        shift=shift,
        location=normalize_location(location_text),
        room=normalize_room(room_text) or "未標示",
    )


def department_span_for_row(page_number: int, top: int, bottom: int) -> tuple[int, int, str] | None:
    row_mid = (top + bottom) / 2
    for span_top, span_bottom, department in PAGE_DEPARTMENT_SPANS.get(page_number, []):
        if span_top <= row_mid <= span_bottom:
            return span_top, span_bottom, department
    return None


def normalize_department(text: str) -> str:
    compact = compact_text(text)
    for department, aliases in DEPARTMENT_ALIASES.items():
        if any(alias in compact for alias in aliases):
            return department
    return ""


def normalize_shift(text: str) -> str:
    compact = compact_text(text)
    if "黃" in compact or "昏" in compact:
        return "黃昏"
    if "下" in compact or "午" in compact and "上" not in compact:
        return "下午"
    if "上" in compact or "午" in compact:
        return "上午"
    return ""


def normalize_location(text: str) -> str:
    compact = compact_text(text)
    if not compact:
        return ""
    if "復健" in compact:
        return "復健大樓2樓"
    if "醫療" in compact or "醫療大樓" in compact:
        return "醫療大樓2樓"
    if "放射" in compact:
        return "放射腫瘤中心"
    return compact[:12]


def normalize_room(text: str) -> str:
    compact = compact_text(text)
    match = re.search(r"([一二三四五六七八九十])\s*[診詒]\s*(\d{1,2})", compact)
    if match:
        return f"{match.group(1)}診{match.group(2)}"
    if "於原" in compact or "專科診" in compact:
        return "於原專科診間"
    return ""


def extract_doctors(text: str) -> list[tuple[str, str]]:
    raw = compact_text(text)
    if not raw:
        return []
    note = "；".join(dict.fromkeys(match.strip() for match in NOTE_PATTERN.findall(raw) if match.strip()))
    doctors: list[tuple[str, str]] = []
    compact = "".join(raw.split())
    seen: set[str] = set()
    matches = list(DOCTOR_PATTERN.finditer(compact))
    if not matches and not NOTE_PATTERN.search(raw):
        matches = [
            match for match in re.finditer(r"([\u4e00-\u9fff]{2,4})", compact)
            if not should_ignore_name(match.group(1))
        ]
    for match in matches:
        name = normalize_doctor_name(match.group(1))
        if not name or name in seen:
            continue
        seen.add(name)
        doctors.append((name, note))
    return doctors


def normalize_doctor_name(text: str) -> str:
    name = re.sub(r"[^\u4e00-\u9fff]", "", text)
    if len(name) > 4:
        name = name[-3:]
    if len(name) < 2 or len(name) > 4:
        return ""
    if should_ignore_name(name):
        return ""
    return name


def should_ignore_name(name: str) -> bool:
    ignored_tokens = [
        "星期",
        "上午",
        "下午",
        "黃昏",
        "門診",
        "醫師",
        "報到",
        "特診",
        "特詁",
        "特誥",
        "內科",
        "外科",
        "胸腔",
        "障礙",
        "結石",
        "排尿",
        "腺",
        "報到",
        "先盾診",
        "先翊診",
    ]
    return any(token in name for token in ignored_tokens)


def ocr_crop(image: Image.Image, box: tuple[int, int, int, int], psm: str) -> str:
    cropped = image.crop(tuple(round(value * image.width / 1080) for value in box))
    grayscale = ImageOps.grayscale(cropped)
    grayscale = ImageEnhance.Contrast(grayscale).enhance(2.5)
    return ocr_base_crop(image, box, psm=psm) if cropped.width else ""


def dedupe(items: list[RawSchedule]) -> list[RawSchedule]:
    seen: set[tuple[str, str, int, str, str]] = set()
    deduped: list[RawSchedule] = []
    for item in items:
        key = (item.department, item.doctor_name, item.weekday, item.period, item.room)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def compact_text(text: str) -> str:
    return " ".join(text.replace("\u3000", " ").split())
