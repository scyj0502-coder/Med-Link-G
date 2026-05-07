from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

import fitz

from source_registry import SourceRow, read_sources
from source_sync import download_source, find_tesseract


def find_source(rows: list[SourceRow], hospital_keyword: str) -> SourceRow:
    for row in rows:
        if row.enabled and hospital_keyword in row.hospital_name:
            return row
    raise SystemExit(f"找不到啟用中的來源：{hospital_keyword}")


def ocr_pdf(row: SourceRow, pages: int | None, dpi: int, languages: str) -> dict:
    executable = find_tesseract()
    if not executable:
        raise SystemExit("找不到 Tesseract OCR。請先安裝 Tesseract，或將 tesseract.exe 加入 PATH。")

    with tempfile.TemporaryDirectory(prefix="med-link-okayama-ocr-") as temp_name:
        temp_dir = Path(temp_name)
        pdf_path, content_type = download_source(row, temp_dir)
        document = fitz.open(pdf_path)
        try:
            page_count = document.page_count
            page_limit = min(pages or page_count, page_count)
            results = []

            for page_index in range(page_limit):
                page = document[page_index]
                pixmap = page.get_pixmap(dpi=dpi, alpha=False)
                image_path = temp_dir / f"page-{page_index + 1:02d}.png"
                text_base = temp_dir / f"page-{page_index + 1:02d}"
                pixmap.save(image_path)
                run_tesseract(executable, image_path, text_base, languages)
                text = text_base.with_suffix(".txt").read_text(encoding="utf-8", errors="ignore")
                results.append({
                    "page": page_index + 1,
                    "textChars": len(text.strip()),
                    "lineCount": len([line for line in text.splitlines() if line.strip()]),
                    "text": text,
                })
        finally:
            document.close()

    return {
        "source": asdict(row),
        "syncedAt": datetime.now(timezone.utc).isoformat(),
        "parser": "okayama_ocr.py",
        "contentType": content_type,
        "dpi": dpi,
        "languages": languages,
        "pageCount": page_count,
        "ocrPageCount": len(results),
        "stats": {
            "textChars": sum(page["textChars"] for page in results),
            "lineCount": sum(page["lineCount"] for page in results),
        },
        "pages": results,
    }


def run_tesseract(executable: str, image_path: Path, text_base: Path, languages: str) -> None:
    result = subprocess.run(
        [
            executable,
            str(image_path),
            str(text_base),
            "-l",
            languages,
            "--psm",
            "6",
            "--oem",
            "1",
        ],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "Tesseract OCR failed.")


def main() -> None:
    parser = argparse.ArgumentParser(description="OCR KMU Okayama outpatient schedule image PDF.")
    parser.add_argument("--input", default="data/sources.sample.csv")
    parser.add_argument("--output", default="data/okayama-ocr.json")
    parser.add_argument("--hospital-keyword", default="岡山")
    parser.add_argument("--pages", type=int, default=0, help="0 means all pages.")
    parser.add_argument("--dpi", type=int, default=220)
    parser.add_argument("--languages", default="chi_tra+eng")
    args = parser.parse_args()

    rows = read_sources(Path(args.input))
    row = find_source(rows, args.hospital_keyword)
    payload = ocr_pdf(row, args.pages or None, args.dpi, args.languages)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "output": str(output),
        "ocrPageCount": payload["ocrPageCount"],
        "textChars": payload["stats"]["textChars"],
        "lineCount": payload["stats"]["lineCount"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
