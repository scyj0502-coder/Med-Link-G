from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from adapters.cgmh_image import CgmhImageAdapter
from core.quality import partition_publishable
from core.yaml_config import load_config


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect image-based Chang Gung PDF OCR extraction.")
    parser.add_argument("source_id", nargs="?", default="cgmh-datong")
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    source = next(item for item in load_config(Path("scraper/config.yaml")).hospitals if item.id == args.source_id)
    scraped = CgmhImageAdapter(source).fetch()
    publishable, rejected = partition_publishable(scraped)
    result = {
        "source": asdict(source),
        "summary": {
            "scraped": len(scraped),
            "publishable": len(publishable),
            "rejected": len(rejected),
        },
        "department_counts": dict(Counter(item.department for item in publishable).most_common(50)),
        "period_counts": dict(Counter(item.period for item in publishable).most_common()),
        "sample": [asdict(item) for item in publishable[: args.limit]],
        "rejected": [{"reason": item.reason, "item": asdict(item.item)} for item in rejected[: args.limit]],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
