from __future__ import annotations

import argparse
import json
from pathlib import Path


def build_baseline(input_path: Path) -> dict:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    items = payload.get("items", [])
    verifications = {
        item["key"]: item["verification"]
        for item in items
        if item.get("key") and item.get("verification")
    }
    status_counts: dict[str, int] = {}
    for verification in verifications.values():
        status = verification.get("status", "pending")
        status_counts[status] = status_counts.get(status, 0) + 1

    return {
        "sourceFile": str(input_path),
        "exportedAt": payload.get("exportedAt", ""),
        "filters": payload.get("filters", {}),
        "statusCounts": status_counts,
        "items": items,
        "verifications": verifications,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert exported Med-Link validation JSON into baseline JSON.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", default="data/validation-baseline.json")
    args = parser.parse_args()

    baseline = build_baseline(Path(args.input))
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(baseline, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "output": str(output),
        "items": len(baseline["items"]),
        "statusCounts": baseline["statusCounts"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
