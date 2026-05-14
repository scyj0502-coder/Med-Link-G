from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from adapters.cgmh_text import CgmhTextAdapter
from core.quality import partition_publishable
from core.yaml_config import load_config


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect Chang Gung text-PDF extraction quality.")
    parser.add_argument("source_id", nargs="?", default="cgmh-kaohsiung")
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    config = load_config(Path("scraper/config.yaml"))
    source = next(item for item in config.hospitals if item.id == args.source_id)
    scraped = CgmhTextAdapter(source).fetch()
    publishable, rejected = partition_publishable(scraped)
    suspicious_departments = sorted(
        {
            item.department
            for item in publishable
            if len(item.department) > 16 or item.department.count("科") > 1
        }
    )

    result = {
        "source": asdict(source),
        "summary": {
            "scraped": len(scraped),
            "publishable": len(publishable),
            "rejected": len(rejected),
            "no_room": sum(1 for item in scraped if not item.room or item.room == "未標示樓層"),
            "suspicious_department_count": len(suspicious_departments),
        },
        "department_counts": dict(Counter(item.department for item in publishable).most_common(50)),
        "room_counts": dict(Counter(item.room for item in publishable).most_common(50)),
        "suspicious_departments": suspicious_departments[:50],
        "sample": [asdict(item) for item in publishable[: args.limit]],
        "rejected": [
            {"reason": item.reason, "item": asdict(item.item)}
            for item in rejected[: args.limit]
        ],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
