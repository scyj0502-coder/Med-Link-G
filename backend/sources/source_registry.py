from __future__ import annotations

import argparse
import csv
import json
from dataclasses import asdict, dataclass
from pathlib import Path


ENABLED = "啟用"


@dataclass(frozen=True)
class SourceRow:
    region: str
    hospital_short_name: str
    hospital_full_name: str
    branch_name: str
    hospital_name: str
    departments: list[str]
    source_type: str
    schedule_url: str
    status: str
    note: str = ""

    @property
    def enabled(self) -> bool:
        return self.status == ENABLED


def read_sources(path: Path) -> list[SourceRow]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        return [normalize_row(row) for row in reader]


def normalize_row(row: dict[str, str]) -> SourceRow:
    region = (row.get("區域") or "").strip()
    hospital_short_name = (row.get("醫院簡稱") or "").strip()
    hospital_full_name = (row.get("醫院全名") or row.get("醫院名稱") or "").strip()
    branch_name = (row.get("分院名稱") or "").strip()
    hospital_name = (row.get("醫院名稱") or "").strip()
    if not hospital_name:
        hospital_name = "-".join(value for value in [hospital_full_name, branch_name] if value)

    departments = [
        value.strip()
        for value in (row.get("科別") or "").replace("，", ",").split(",")
        if value.strip()
    ]
    return SourceRow(
        region=region,
        hospital_short_name=hospital_short_name,
        hospital_full_name=hospital_full_name,
        branch_name=branch_name,
        hospital_name=hospital_name,
        departments=departments,
        source_type=(row.get("來源類型") or "").strip(),
        schedule_url=(row.get("門診連結位置") or "").strip(),
        status=(row.get("狀態") or "").strip(),
        note=(row.get("備註") or "").strip(),
    )


def validate_sources(rows: list[SourceRow]) -> list[str]:
    errors = []
    for index, row in enumerate(rows, start=2):
        if not row.enabled:
            continue
        if not row.hospital_name:
            errors.append(f"第 {index} 列：醫院全名或醫院名稱不可空白")
        if not row.departments:
            errors.append(f"第 {index} 列：科別不可空白")
        if not row.schedule_url.startswith(("http://", "https://")):
            errors.append(f"第 {index} 列：門診連結位置必須是 http 或 https")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Read Med-Link source registry CSV.")
    parser.add_argument("--input", default="data/sources.sample.csv")
    parser.add_argument("--output", default="")
    args = parser.parse_args()

    rows = read_sources(Path(args.input))
    errors = validate_sources(rows)
    payload = {
        "enabled": [asdict(row) | {"enabled": row.enabled} for row in rows if row.enabled],
        "disabled": [asdict(row) | {"enabled": row.enabled} for row in rows if not row.enabled],
        "errors": errors,
    }

    if args.output:
        Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        print(json.dumps(payload, ensure_ascii=False, indent=2))

    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
