from __future__ import annotations

import io
import os
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

import fitz
import httpx
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


class EdahPdfAdapter(ScheduleAdapter):
    """E-DA image-based PDF source.

    E-DA publishes outpatient schedule PDFs that must be OCR'd. The first
    production step is branch detection and page diagnostics; schedule-row
    extraction is intentionally not published yet.
    """

    def fetch(self) -> list[RawSchedule]:
        raise NotImplementedError("E-DA PDF OCR schedule extraction is not implemented yet.")

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


def branch_name_for(branch_ids: list[str]) -> str:
    if len(branch_ids) != 1:
        return ""
    return BRANCH_NAMES[branch_ids[0]]


def is_schedule_page(text: str) -> bool:
    compact = compact_text(text)
    return sum(keyword.replace(" ", "") in compact for keyword in SCHEDULE_PAGE_KEYWORDS) >= 2


def compact_text(text: str) -> str:
    return "".join(text.split())
