from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter
from dataclasses import asdict
from pathlib import Path

from dotenv import load_dotenv

from adapters.pingtung_mohw import (
    PingtungMohwAdapter,
    iter_schedule_cells,
    uncorrected_doctor_candidates,
)
from core.models import schedule_payload
from core.quality import partition_publishable
from core.yaml_config import load_config


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CACHE_DIR = SCRIPT_DIR.parent / "data" / "ocr-cache" / "pingtung"


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Inspect Pingtung Hospital parsed schedule candidates.")
    parser.add_argument("--limit", type=int, default=40, help="Maximum rows to include in detail sections.")
    parser.add_argument("--no-cache", action="store_true", help="Disable local OCR cache.")
    args = parser.parse_args()

    if not args.no_cache:
        os.environ.setdefault("MED_LINK_OCR_CACHE_DIR", str(DEFAULT_CACHE_DIR))

    load_dotenv(SCRIPT_DIR / ".env")
    config = load_config(SCRIPT_DIR / "config.yaml")
    source = next((item for item in config.hospitals if item.id == "pingtung-mohw"), None)
    if not source:
        raise SystemExit("Missing pingtung-mohw source in config.yaml.")

    scraped = PingtungMohwAdapter(source).fetch()
    publishable, rejected = partition_publishable(scraped)
    detail_limit = args.limit or None
    no_room = [item for item in publishable if item.room == "未標示"]
    combined_room = [item for item in publishable if "/" in item.room]
    uncorrected = []
    for cell in iter_schedule_cells(source.schedule_url):
        candidates = uncorrected_doctor_candidates(cell.raw_text, cell.context.department)
        if not candidates:
            continue
        uncorrected.append(
            {
                "page": cell.page_number,
                "row": cell.row_index,
                "department": cell.context.department,
                "period": cell.context.shift,
                "room": cell.context.room,
                "weekday": cell.weekday_label,
                "candidates": candidates,
                "raw_text": " ".join(cell.raw_text.replace("\u3000", " ").split()),
            }
        )
    payload = {
        "source": asdict(source),
        "cache_dir": None if args.no_cache else str(DEFAULT_CACHE_DIR),
        "summary": {
            "scraped": len(scraped),
            "publishable": len(publishable),
            "rejected": len(rejected),
            "no_room": len(no_room),
            "combined_room": len(combined_room),
            "uncorrected_candidate_cells": len(uncorrected),
        },
        "department_counts": dict(Counter(item.department for item in publishable).most_common()),
        "room_counts": dict(Counter(item.room for item in publishable).most_common()),
        "no_room": [schedule_payload(item) for item in no_room[:detail_limit]],
        "combined_room": [schedule_payload(item) for item in combined_room[:detail_limit]],
        "uncorrected_candidates": uncorrected[:detail_limit],
        "rejected": [
            {"reason": item.reason, "payload": schedule_payload(item.item)}
            for item in rejected[:detail_limit]
        ],
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
