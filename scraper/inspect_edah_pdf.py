from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from dotenv import load_dotenv

from adapters.edah_pdf import EdahPdfAdapter
from core.yaml_config import load_config


SCRIPT_DIR = Path(__file__).resolve().parent


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Inspect E-DA PDF OCR and branch markers.")
    parser.add_argument("target", nargs="?", default="edah-main", help="Hospital id, e.g. edah-main.")
    parser.add_argument("--pages", type=int, default=4, help="Number of PDF pages to OCR.")
    args = parser.parse_args()

    load_dotenv()
    config = load_config(SCRIPT_DIR / "config.yaml")
    source = next((item for item in config.hospitals if item.id == args.target), None)
    if not source:
      raise SystemExit(f"Unknown E-DA source: {args.target}")
    if source.adapter != "edah_pdf":
      raise SystemExit(f"{args.target} does not use edah_pdf adapter.")

    inspection = EdahPdfAdapter(source).inspect(max_pages=args.pages)
    print(json.dumps(asdict(inspection), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
