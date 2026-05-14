from __future__ import annotations

import hashlib
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin

import fitz
import httpx
from bs4 import BeautifulSoup
from pypdf import PdfReader


SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = SCRIPT_DIR.parent / "data" / "source-probe"


@dataclass(frozen=True)
class ProbeSource:
    id: str
    name: str
    url: str
    mode: str


SOURCES = [
    ProbeSource(
        id="tatung-cgmh",
        name="醫療合作醫院-大同醫院",
        url="https://register.cgmh.org.tw/OpTimeSheet/260421001W_upload.pdf",
        mode="direct",
    ),
    ProbeSource(
        id="pingtung-mohw-page",
        name="衛生福利部屏東醫院門診表列表頁",
        url="https://www.pntn.mohw.gov.tw/?aid=602&iid=2",
        mode="html",
    ),
    ProbeSource(
        id="pintung-mohw-pdf",
        name="衛生福利部屏東醫院 115 年 5 月門診表",
        url="https://www.pntn.mohw.gov.tw/?aid=down&url=cHVibGljX2NvLzYwMi8xNzc4NjMyMTAzNTIwOC5wZGYsMzQ",
        mode="direct",
    ),
    ProbeSource(
        id="shinkao-may-page",
        name="新高醫院 5 月份門診表圖片頁",
        url="https://www.shinkaohosp.com.tw/content.aspx?menuID=S0051&id=7121",
        mode="html",
    ),
    ProbeSource(
        id="shinkao-schedule",
        name="新高醫院網頁版門診表",
        url="https://www.shinkaohosp.com.tw/schedule.aspx",
        mode="html",
    ),
    ProbeSource(
        id="kaohsiung-cgmh",
        name="高雄長庚醫院 115 年 5-6 月門診表",
        url="https://register.cgmh.org.tw/OpTimeSheet/250429004_upload.pdf",
        mode="direct",
    ),
]


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=60, follow_redirects=True) as client:
        for source in SOURCES:
            print(f"\n## {source.name} ({source.id})")
            response = client.get(source.url)
            print(f"url: {response.url}")
            print(f"status: {response.status_code}")
            print(f"content-type: {response.headers.get('content-type', '')}")
            print(f"bytes: {len(response.content)}")
            response.raise_for_status()

            suffix = guess_suffix(response)
            saved_path = save_bytes(source.id, response.content, suffix)
            print(f"saved: {saved_path}")
            if suffix == ".pdf":
                describe_pdf(saved_path)
            elif suffix in {".html", ".aspx"}:
                describe_html(source.url, response.text)


def guess_suffix(response: httpx.Response) -> str:
    content_type = response.headers.get("content-type", "").lower()
    if "pdf" in content_type or response.content[:4] == b"%PDF":
        return ".pdf"
    if "image/" in content_type:
        return "." + content_type.split("image/", 1)[1].split(";", 1)[0].replace("jpeg", "jpg")
    return ".html"


def save_bytes(source_id: str, content: bytes, suffix: str) -> Path:
    digest = hashlib.sha1(content).hexdigest()[:8]
    path = OUTPUT_DIR / f"{source_id}-{digest}{suffix}"
    path.write_bytes(content)
    return path


def describe_pdf(path: Path) -> None:
    reader = PdfReader(path)
    embedded_chars = sum(len(page.extract_text() or "") for page in reader.pages)
    print(f"pdf_pages: {len(reader.pages)}")
    print(f"embedded_text_chars: {embedded_chars}")
    document = fitz.open(path)
    for index in range(min(2, len(document))):
        text = document[index].get_text("text").strip()
        preview = compact(text)[:240]
        print(f"page_{index + 1}_text_preview: {preview or '(no embedded text)'}")


def describe_html(base_url: str, html: str) -> None:
    soup = BeautifulSoup(html, "html.parser")
    title = compact(soup.get_text(" ", strip=True))[:240]
    print(f"text_preview: {title}")

    links = []
    for tag in soup.find_all(["a", "img"]):
        raw_url = tag.get("href") or tag.get("src")
        if not raw_url:
            continue
        absolute = urljoin(base_url, raw_url)
        label = compact(tag.get_text(" ", strip=True) or tag.get("alt") or "")
        if is_interesting_asset(absolute, label):
            links.append((label, absolute))

    print(f"interesting_links: {len(links)}")
    for label, absolute in links[:20]:
        print(f"- {label or '(no label)'} -> {absolute}")


def is_interesting_asset(url: str, label: str) -> bool:
    value = f"{url} {label}".lower()
    return any(token in value for token in [".pdf", ".jpg", ".jpeg", ".png", "門診", "schedule", "opd"])


def compact(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


if __name__ == "__main__":
    main()
