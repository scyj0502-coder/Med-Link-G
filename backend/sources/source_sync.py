from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import fitz

from source_registry import SourceRow, read_sources, validate_sources


USER_AGENT = "Med-Link source sync/0.1"


def download_source(row: SourceRow, target_dir: Path) -> tuple[Path, str]:
    target_dir.mkdir(parents=True, exist_ok=True)
    request = Request(row.schedule_url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=45) as response:
        content_type = response.headers.get("Content-Type", "")
        suffix = extension_from_url(row.schedule_url) or extension_from_content_type(content_type)
        target = target_dir / f"{safe_slug(row.hospital_name)}{suffix}"
        target.write_bytes(response.read())
    return target, content_type


def extension_from_url(url: str) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    return suffix if suffix in {".pdf", ".html", ".htm"} else ""


def extension_from_content_type(content_type: str) -> str:
    lowered = content_type.lower()
    if "pdf" in lowered:
        return ".pdf"
    if "html" in lowered:
        return ".html"
    return ".bin"


def inspect_pdf(path: Path, content_type: str) -> dict:
    document = fitz.open(path)
    page_text_counts = []
    for page in document:
      text = page.get_text("text")
      page_text_counts.append(len(text.strip()))

    total_text_chars = sum(page_text_counts)
    return {
        "sourceKind": "PDF",
        "contentType": content_type,
        "downloadedBytes": path.stat().st_size,
        "pageCount": document.page_count,
        "textChars": total_text_chars,
        "pageTextChars": page_text_counts,
        "requiresOcr": total_text_chars < 50,
        "quality": "pdf-text-extracted" if total_text_chars >= 50 else "image-pdf-requires-ocr",
    }


def inspect_file(path: Path, content_type: str) -> dict:
    if path.suffix.lower() == ".pdf" or "pdf" in content_type.lower():
        return inspect_pdf(path, content_type)
    return {
        "sourceKind": "URL",
        "contentType": content_type,
        "downloadedBytes": path.stat().st_size,
        "requiresOcr": False,
        "quality": "downloaded",
    }


def inspect_tesseract() -> dict:
    executable = shutil.which("tesseract")
    if not executable:
        return {
            "available": False,
            "executable": "",
            "languages": [],
            "note": "本機尚未偵測到 Tesseract OCR；圖片型 PDF 會先標示待 OCR。",
        }

    languages: list[str] = []
    try:
        result = subprocess.run(
            [executable, "--list-langs"],
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
        )
        languages = [
            line.strip()
            for line in result.stdout.splitlines()
            if line.strip() and not line.lower().startswith("list of available")
        ]
    except OSError:
        languages = []

    return {
        "available": True,
        "executable": executable,
        "languages": languages,
        "hasChineseTraditional": "chi_tra" in languages,
        "note": "已偵測到 Tesseract；若有 chi_tra 語言包即可解析繁體中文。",
    }


def sync_sources(input_path: Path) -> dict:
    rows = read_sources(input_path)
    registry_errors = validate_sources(rows)
    ocr = inspect_tesseract()
    sources = []

    with tempfile.TemporaryDirectory(prefix="med-link-sources-") as temp_name:
        temp_dir = Path(temp_name)
        for index, row in enumerate(rows, start=2):
            if not row.enabled:
                sources.append({
                    "row": index,
                    "enabled": False,
                    "source": asdict(row),
                    "status": "skipped",
                    "message": "狀態不是啟用，已跳過。",
                })
                continue

            try:
                downloaded, content_type = download_source(row, temp_dir)
                inspection = inspect_file(downloaded, content_type)
                message = build_message(row, inspection, ocr)
                sources.append({
                    "row": index,
                    "enabled": True,
                    "source": asdict(row),
                    "status": "ok",
                    "message": message,
                    "inspection": inspection,
                })
            except (OSError, URLError, fitz.FileDataError, fitz.FileNotFoundError) as error:
                sources.append({
                    "row": index,
                    "enabled": True,
                    "source": asdict(row),
                    "status": "error",
                    "message": str(error),
                })

    return {
        "syncedAt": datetime.now(timezone.utc).isoformat(),
        "input": str(input_path),
        "ocr": ocr,
        "registryErrors": registry_errors,
        "sources": sources,
        "summary": {
            "enabled": sum(1 for item in sources if item["enabled"]),
            "skipped": sum(1 for item in sources if not item["enabled"]),
            "errors": len(registry_errors) + sum(1 for item in sources if item["status"] == "error"),
            "requiresOcr": sum(
                1 for item in sources
                if item.get("inspection", {}).get("requiresOcr")
            ),
        },
    }


def build_message(row: SourceRow, inspection: dict, ocr: dict) -> str:
    if inspection.get("requiresOcr"):
        if not ocr["available"]:
            return f"{row.hospital_name} 是圖片型 PDF，需安裝 Tesseract OCR 後才能解析醫師診次。"
        if not ocr.get("hasChineseTraditional"):
            return f"{row.hospital_name} 是圖片型 PDF，已偵測 OCR，但缺少 chi_tra 繁體中文語言包。"
        return f"{row.hospital_name} 是圖片型 PDF，可進入 OCR 解析階段。"
    return f"{row.hospital_name} 可直接抽取文字，共 {inspection.get('textChars', 0)} 字。"


def safe_slug(value: str) -> str:
    return "".join(char if char.isalnum() else "-" for char in value).strip("-") or "source"


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect and prepare Med-Link source sync jobs.")
    parser.add_argument("--input", default="data/sources.sample.csv")
    parser.add_argument("--output", default="data/source-sync-status.json")
    args = parser.parse_args()

    payload = sync_sources(Path(args.input))
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload["summary"], ensure_ascii=False))

    if payload["summary"]["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
