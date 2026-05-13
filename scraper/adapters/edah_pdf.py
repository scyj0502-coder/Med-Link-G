from __future__ import annotations

import io
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import fitz
import httpx
from bs4 import BeautifulSoup
from PIL import Image
from PIL import ImageEnhance
from PIL import ImageOps
from pypdf import PdfReader

from adapters.base import RawSchedule, ScheduleAdapter


BRANCH_KEYWORDS = {
    "edah-main": ["義大醫院", "義大醫院門診時間表", "義大 1 醫療", "義大1醫療"],
    "edah-cancer": [
        "義大癌治療醫院",
        "癌治療醫院",
        "義大 2 醫療",
        "義大2醫療",
        # Common OCR variants from E-DA's image PDFs.
        "義大痰治",
        "義大瘟治",
        "義大癭治",
        "痰治療醫院",
        "癭治療醫院",
        "療醫院門診時間表",
        "治療醫院門診時間表",
    ],
    "edah-dachang": [
        "義大大昌醫院",
        "大昌醫院",
        "義大 3 醫療",
        "義大3醫療",
        "義大大",
        "皇大大",
        "大昌醫院門診時間表",
    ],
}

BRANCH_NAMES = {
    "edah-main": "義大醫院",
    "edah-cancer": "義大癌治療醫院",
    "edah-dachang": "義大大昌醫院",
}

SCHEDULE_PAGE_KEYWORDS = ["門診時間表", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
WEEKDAY_COLUMNS = [
    (1, "星期一", 216, 348),
    (2, "星期二", 348, 480),
    (3, "星期三", 480, 612),
    (4, "星期四", 612, 744),
    (5, "星期五", 744, 877),
    (6, "星期六", 877, 1018),
]
PERIODS = ["上午", "下午", "夜診"]
DEPARTMENT_COLUMN = (60, 192)
TABLE_Y_RANGE = (110, 1240)
OCR_CANDIDATE_CONFIDENCE = 0.78
DOCTOR_PATTERN = re.compile(r"([\u4e00-\u9fff]{2,6})(\d{4,5})")
NOTE_KEYWORDS = [
    "停診",
    "約診",
    "限約",
    "限掛",
    "限診",
    "初診",
    "特診",
    "特殊",
    "特約",
    "限號",
    "看報告",
]
DEPARTMENT_ALIASES = {
    "心臟內科": ["心臟內科", "心臟血管內科"],
    "胃腸肝膽科": ["胃腸肝膽科", "腸肝膽科", "腔腸肝膊科", "胃腸肝膊科"],
    "高階胃食道逆流診治中心": ["高階胃食道逆流", "胃食道逆流"],
    "呼吸胸腔科": ["呼吸胸腔科", "呼吸胸科"],
    "腎臟科": ["腎臟科"],
    "神經科": ["神經科"],
    "血液腫瘤科": ["血液腫瘤科", "血液睡瘤科"],
    "過敏免疫風濕科": ["過敏免疫風濕科", "免疫風濕科"],
    "感染科": ["感染科"],
    "新陳代謝科": ["新陳代謝科"],
    "家醫科": ["家醫科"],
    "體檢科": ["體檢科"],
    "健診中心特約門診": ["健診中心特約門診", "健診中心"],
}


@dataclass(frozen=True)
class EdahPageInspection:
    page_number: int
    detected_branch_ids: list[str]
    detected_branch_name: str
    is_schedule_page: bool
    text_preview: str


@dataclass(frozen=True)
class EdahPdfInspection:
    source_id: str
    expected_branch_name: str
    url: str
    page_count: int
    embedded_text_chars: int
    requires_ocr: bool
    detected_branch_ids: list[str]
    pages: list[EdahPageInspection] = field(default_factory=list)


@dataclass(frozen=True)
class DoctorCandidate:
    ocr_name: str
    code: str


class EdahPdfAdapter(ScheduleAdapter):
    """E-DA image-based PDF source.

    E-DA publishes outpatient schedule PDFs that must be OCR'd. The first
    production step is branch detection and page diagnostics; schedule-row
    extraction is intentionally not published yet.
    """

    def fetch(self) -> list[RawSchedule]:
        pdf_bytes = download_pdf(self.source.schedule_url)
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
        schedules: list[RawSchedule] = []
        seen: set[tuple[str, str, int, str]] = set()
        doctor_cache: dict[str, str | None] = {}

        for page_index in range(len(document)):
            page = document[page_index]
            markers = ocr_page_markers(page)
            branch_ids = detect_branch_ids(markers.header_text)
            if branch_ids != [self.source.id] or not is_schedule_page(markers.header_text):
                continue

            for item in parse_schedule_page(self.source, page, page_index + 1, doctor_cache):
                key = (item.department, item.doctor_name, item.weekday, item.period)
                if key in seen:
                    continue
                seen.add(key)
                schedules.append(item)

        return schedules

    def inspect(self, max_pages: int = 4) -> EdahPdfInspection:
        pdf_bytes = download_pdf(self.source.schedule_url)
        embedded_text_chars = count_embedded_text(pdf_bytes)
        page_texts = ocr_pdf_pages(pdf_bytes, max_pages=max_pages)
        pages = [
            EdahPageInspection(
                page_number=index + 1,
                detected_branch_ids=detect_branch_ids(text.header_text),
                detected_branch_name=branch_name_for(detect_branch_ids(text.header_text)),
                is_schedule_page=is_schedule_page(text.header_text),
                text_preview=compact_text(text.combined_text)[:300],
            )
            for index, text in enumerate(page_texts)
        ]
        detected = sorted({branch_id for page in pages for branch_id in page.detected_branch_ids})

        return EdahPdfInspection(
            source_id=self.source.id,
            expected_branch_name=self.source.branch_name,
            url=self.source.schedule_url,
            page_count=pdf_page_count(pdf_bytes),
            embedded_text_chars=embedded_text_chars,
            requires_ocr=embedded_text_chars < 100,
            detected_branch_ids=detected,
            pages=pages,
        )


def download_pdf(url: str) -> bytes:
    response = httpx.get(url, timeout=60)
    response.raise_for_status()
    return response.content


def pdf_page_count(pdf_bytes: bytes) -> int:
    return len(PdfReader(io.BytesIO(pdf_bytes)).pages)


def count_embedded_text(pdf_bytes: bytes) -> int:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return sum(len(page.extract_text() or "") for page in reader.pages)


@dataclass(frozen=True)
class EdahPageOcr:
    header_text: str
    footer_text: str

    @property
    def combined_text(self) -> str:
        return f"{self.header_text}\n{self.footer_text}"


def ocr_pdf_pages(pdf_bytes: bytes, max_pages: int) -> list[EdahPageOcr]:
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = min(max_pages, len(document))
    return [ocr_page_markers(document[page_index]) for page_index in range(page_count)]


def ocr_page_markers(page: fitz.Page) -> EdahPageOcr:
    matrix = fitz.Matrix(3, 3)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    image = Image.open(io.BytesIO(pixmap.tobytes("png")))
    width, height = image.size
    header = image.crop((0, 0, width, int(height * 0.20)))
    footer = image.crop((0, int(height * 0.84), width, height))
    return EdahPageOcr(
        header_text=ocr_image(header, psm="11"),
        footer_text=ocr_image(footer, psm="6"),
    )


def parse_schedule_page(
    source,
    page: fitz.Page,
    page_number: int,
    doctor_cache: dict[str, str | None],
) -> list[RawSchedule]:
    base_image = render_page(page, scale=2)
    ocr_image_source = render_page(page, scale=4)
    block_edges = detect_department_block_edges(base_image)
    schedules: list[RawSchedule] = []

    for top, bottom in zip(block_edges, block_edges[1:]):
        if bottom - top < 35:
            continue
        department_text = ocr_base_crop(
            ocr_image_source,
            (DEPARTMENT_COLUMN[0], top + 2, DEPARTMENT_COLUMN[1], bottom - 2),
            psm="6",
        )
        department = canonical_department(department_text)
        if not department:
            continue

        period_ranges = split_period_ranges(top, bottom)
        for period, (period_top, period_bottom) in zip(PERIODS, period_ranges):
            if period_bottom - period_top < 12:
                continue
            for weekday, weekday_label, left, right in WEEKDAY_COLUMNS:
                cell_text = ocr_base_crop(
                    ocr_image_source,
                    (left + 2, period_top + 1, right - 2, period_bottom - 1),
                    psm="6",
                )
                for candidate in extract_doctor_candidates(cell_text):
                    resolved_name = resolve_doctor_name(candidate.code, doctor_cache)
                    if resolved_name and is_plausible_doctor_match(candidate.ocr_name, resolved_name):
                        doctor_name = resolved_name
                        confidence = 0.91
                    else:
                        doctor_name = candidate.ocr_name
                        confidence = OCR_CANDIDATE_CONFIDENCE
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
                            room=candidate.code,
                            source_url=source.schedule_url,
                            source_ref=(
                                f"pdf_page:{page_number};cell:{weekday_label}-{period};"
                                f"doctor_code:{candidate.code}"
                            ),
                            confidence=confidence,
                            note=extract_note(cell_text),
                            raw_text=compact_text(cell_text),
                            source_page=page_number,
                        )
                    )

    return schedules


def render_page(page: fitz.Page, scale: int) -> Image.Image:
    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    return Image.open(io.BytesIO(pixmap.tobytes("png")))


def detect_department_block_edges(image: Image.Image) -> list[int]:
    grayscale = ImageOps.grayscale(image)
    left, right = DEPARTMENT_COLUMN
    y_start, y_end = TABLE_Y_RANGE
    lines: list[int] = []
    for y in range(y_start, min(y_end, grayscale.height)):
        dark_pixels = sum(1 for x in range(left - 5, right + 3) if grayscale.getpixel((x, y)) < 130)
        if dark_pixels > 90:
            lines.append(y)

    groups: list[list[int]] = []
    for y in lines:
        if not groups or y > groups[-1][-1] + 1:
            groups.append([])
        groups[-1].append(y)

    edges = [round(sum(group) / len(group)) for group in groups]
    return [edge for edge in edges if 145 <= edge <= 1240]


def split_period_ranges(top: int, bottom: int) -> list[tuple[int, int]]:
    height = bottom - top
    first = top + round(height / 3)
    second = top + round(height * 2 / 3)
    return [(top, first), (first, second), (second, bottom)]


def ocr_base_crop(image: Image.Image, box: tuple[int, int, int, int], psm: str) -> str:
    factor = image.width / 1080
    scaled_box = tuple(round(value * factor) for value in box)
    crop = image.crop(scaled_box)
    grayscale = ImageOps.grayscale(crop)
    grayscale = ImageEnhance.Contrast(grayscale).enhance(2.5)
    grayscale = grayscale.resize((grayscale.width * 2, grayscale.height * 2))
    return ocr_image(grayscale, psm=psm)


def ocr_image(image: Image.Image, psm: str) -> str:
    grayscale = ImageOps.grayscale(image)
    grayscale = ImageEnhance.Contrast(grayscale).enhance(2.0)
    with tempfile.TemporaryDirectory() as tmpdir:
        image_path = Path(tmpdir) / "page.png"
        output_base = Path(tmpdir) / "ocr"
        grayscale.save(image_path)
        command = [
            tesseract_executable(),
            str(image_path),
            str(output_base),
            "-l",
            "chi_tra+eng",
            "--psm",
            psm,
        ]
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return (output_base.with_suffix(".txt")).read_text(encoding="utf-8", errors="ignore")


def tesseract_executable() -> str:
    configured = os.environ.get("TESSERACT_CMD")
    if configured:
        return configured
    windows_default = Path("C:/Program Files/Tesseract-OCR/tesseract.exe")
    if windows_default.exists():
        return str(windows_default)
    return "tesseract"


def detect_branch_ids(text: str) -> list[str]:
    compact = compact_text(text)
    return [
        branch_id
        for branch_id, keywords in BRANCH_KEYWORDS.items()
        if any(keyword.replace(" ", "") in compact for keyword in keywords)
    ]


def canonical_department(text: str) -> str:
    compact = compact_text(text)
    for canonical, aliases in DEPARTMENT_ALIASES.items():
        if any(alias in compact for alias in aliases):
            return canonical
    return ""


def extract_doctor_candidates(text: str) -> list[DoctorCandidate]:
    compact = compact_text(text)
    candidates: list[DoctorCandidate] = []
    seen_codes: set[str] = set()
    for match in DOCTOR_PATTERN.finditer(compact):
        name = normalize_doctor_name(match.group(1))
        code = match.group(2)
        if name and code not in seen_codes:
            seen_codes.add(code)
            candidates.append(DoctorCandidate(ocr_name=name, code=code))
    return candidates


def extract_note(text: str) -> str:
    compact = compact_text(text)
    notes: list[str] = []
    for keyword in NOTE_KEYWORDS:
        if keyword in compact:
            notes.append(keyword)
    for date_match in re.finditer(r"\d{1,2}/\d{1,2}(?:[、,，.]\d{1,2})*", compact):
        notes.append(date_match.group(0))
    return "；".join(dict.fromkeys(notes))


def resolve_doctor_name(code: str, cache: dict[str, str | None]) -> str | None:
    if code in cache:
        return cache[code]

    doctor_id = code[-4:]
    url = f"https://webreg.edah.org.tw/Register/ChooseDoctorTime/{doctor_id}"
    try:
        response = httpx.get(url, timeout=15)
        response.raise_for_status()
    except httpx.HTTPError:
        cache[code] = None
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    text = compact_text(soup.get_text("\n"))
    match = re.search(r"([\u4e00-\u9fff]{2,4})\([\u4e00-\u9fff]+科\)", text)
    if not match:
        cache[code] = None
        return None

    cache[code] = match.group(1)
    return cache[code]


def is_plausible_doctor_match(ocr_name: str, resolved_name: str) -> bool:
    shared_chars = set(ocr_name) & set(resolved_name)
    return len(shared_chars) >= (1 if min(len(ocr_name), len(resolved_name)) <= 2 else 2)


def normalize_doctor_name(text: str) -> str:
    name = re.sub(r"[^\u4e00-\u9fff]", "", text)
    if len(name) > 4:
        name = name[-3:]
    if len(name) < 2 or len(name) > 4:
        return ""
    if any(keyword in name for keyword in ["星期", "上午", "下午", "夜診", "門診", "醫院"]):
        return ""
    return name


def branch_name_for(branch_ids: list[str]) -> str:
    if len(branch_ids) != 1:
        return ""
    return BRANCH_NAMES[branch_ids[0]]


def is_schedule_page(text: str) -> bool:
    compact = compact_text(text)
    return sum(keyword.replace(" ", "") in compact for keyword in SCHEDULE_PAGE_KEYWORDS) >= 2


def compact_text(text: str) -> str:
    return "".join(text.split())
