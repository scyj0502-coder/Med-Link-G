from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from adapters.base import RawSchedule
from adapters.cgmh_image import CgmhImageAdapter
from core.quality import partition_publishable
from core.yaml_config import load_config


SUSPICIOUS_NAME_TOKENS = {
    "星期",
    "期一",
    "期二",
    "期三",
    "期四",
    "期五",
    "期六",
    "診",
    "樓",
    "分機",
    "專線",
    "電話",
    "上午",
    "下午",
    "夜診",
    "科",
    "內科",
    "外科",
    "診區",
}
KNOWN_TWO_CHAR_DOCTORS = {"陳聿", "鄭筠"}


def suspicious_reason(item: RawSchedule, name_counts: Counter[str]) -> str | None:
    name = item.doctor_name
    if any(token in name for token in SUSPICIOUS_NAME_TOKENS):
        return "name_contains_non_doctor_token"
    if len(name) < 2 or len(name) > 4:
        return "name_length_outlier"
    if len(name) == 2 and name_counts[name] == 1 and name not in KNOWN_TWO_CHAR_DOCTORS:
        return "single_occurrence_two_char_name"
    if not re.search(r"\d", item.raw_text):
        return "raw_text_without_code"
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect image-PDF OCR quality for Chang Gung style schedules.")
    parser.add_argument("source_id", nargs="?", default="cgmh-datong")
    parser.add_argument("--limit", type=int, default=80)
    args = parser.parse_args()

    source = next(item for item in load_config(Path("scraper/config.yaml")).hospitals if item.id == args.source_id)
    scraped = CgmhImageAdapter(source).fetch()
    publishable, rejected = partition_publishable(scraped)
    name_counts = Counter(item.doctor_name for item in publishable)

    page_counts: dict[int, int] = {}
    page_departments: dict[int, dict[str, int]] = {}
    for item in publishable:
        if item.source_page is None:
            continue
        page_counts[item.source_page] = page_counts.get(item.source_page, 0) + 1
        page_departments.setdefault(item.source_page, {})
        page_departments[item.source_page][item.department] = page_departments[item.source_page].get(item.department, 0) + 1

    suspicious: list[dict] = []
    reason_counts: Counter[str] = Counter()
    for item in publishable:
        reason = suspicious_reason(item, name_counts)
        if not reason:
            continue
        reason_counts[reason] += 1
        suspicious.append(
            {
                "reason": reason,
                "source_page": item.source_page,
                "department": item.department,
                "weekday_label": item.weekday_label,
                "period": item.period,
                "doctor_name": item.doctor_name,
                "raw_text": item.raw_text.strip().replace("\n", " / "),
            }
        )

    result = {
        "source": asdict(source),
        "summary": {
            "scraped": len(scraped),
            "publishable": len(publishable),
            "rejected": len(rejected),
            "suspicious": len(suspicious),
        },
        "page_counts": dict(sorted(page_counts.items())),
        "page_departments": {page: dict(Counter(counts).most_common()) for page, counts in sorted(page_departments.items())},
        "department_counts": dict(Counter(item.department for item in publishable).most_common()),
        "suspicious_reason_counts": dict(reason_counts.most_common()),
        "suspicious": suspicious[: args.limit],
        "rejected": [{"reason": item.reason, "item": asdict(item.item)} for item in rejected[: args.limit]],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
