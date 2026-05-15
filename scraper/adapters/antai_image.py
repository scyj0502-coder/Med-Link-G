from __future__ import annotations

import hashlib
import io
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from PIL import Image

from adapters.base import RawSchedule, ScheduleAdapter
from adapters.edah_pdf import ocr_image


IMAGE_PATTERN = re.compile(r"/images-1003/(\d{6})-(\d+)\.jpg$", re.IGNORECASE)


@dataclass(frozen=True)
class SourceImage:
    url: str
    source_month: str
    page_number: int
    file_hash: str = ""
    raw_text: str = ""


class AntaiImageAdapter(ScheduleAdapter):
    """Antai publishes schedule pages as images embedded in an HTML page.

    The adapter intentionally discovers the image URLs from the page at run
    time. OCR table parsing is kept conservative because the current source is
    a dense newsletter-style image and should not overwrite trusted schedules
    until row/column extraction is proven.
    """

    def fetch(self) -> list[RawSchedule]:
        fetched_at = datetime.now(UTC).isoformat()
        images = discover_latest_images(self.source.schedule_url)
        schedules: list[RawSchedule] = []
        for image_ref in images:
            image_bytes = download(image_ref.url)
            file_hash = hashlib.sha256(image_bytes).hexdigest()
            image = Image.open(io.BytesIO(image_bytes))
            raw_text = ocr_image(preview_crop(image), psm="6")
            schedules.extend(
                parse_ocr_text(
                    source=self.source,
                    image_ref=SourceImage(
                        url=image_ref.url,
                        source_month=image_ref.source_month,
                        page_number=image_ref.page_number,
                        file_hash=file_hash,
                        raw_text=raw_text,
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


def parse_ocr_text(source, image_ref: SourceImage, fetched_at: str) -> list[RawSchedule]:
    # The current Antai image is a dense raster table. Until column detection is
    # added, do not publish guessed schedules from OCR text order.
    _ = (source, image_ref, fetched_at)
    return []

