from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from dotenv import load_dotenv

from adapters.edah_pdf import EdahPdfAdapter
from core.models import schedule_payload
from core.quality import partition_publishable
from core.yaml_config import load_config


SCRIPT_DIR = Path(__file__).resolve().parent


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Inspect E-DA parsed schedule candidates.")
    parser.add_argument("target", nargs="?", default="edah-dachang", help="Hospital id, e.g. edah-dachang.")
    parser.add_argument("--limit", type=int, default=0, help="Limit rows per section; 0 means all.")
    args = parser.parse_args()

    load_dotenv(SCRIPT_DIR / ".env")
    config = load_config(SCRIPT_DIR / "config.yaml")
    source = next((item for item in config.hospitals if item.id == args.target), None)
    if not source:
        raise SystemExit(f"Unknown E-DA source: {args.target}")
    if source.adapter != "edah_pdf":
        raise SystemExit(f"{args.target} does not use edah_pdf adapter.")

    scraped = EdahPdfAdapter(source).fetch()
    publishable, rejected = partition_publishable(scraped)
    limit = args.limit or None
    payload = {
        "source": asdict(source),
        "summary": {
            "scraped": len(scraped),
            "publishable": len(publishable),
            "rejected": len(rejected),
        },
        "publishable": [schedule_payload(item) for item in publishable[:limit]],
        "rejected": [
            {"reason": item.reason, "payload": schedule_payload(item.item)}
            for item in rejected[:limit]
        ],
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
