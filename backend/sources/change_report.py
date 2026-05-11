from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def session_key(hospital_id: str, session: dict) -> str:
    doctor_id = f"{hospital_id}-{slug(session['doctorName'])}-{slug(session['category'])}"
    weekday = session["weekdays"][0]
    return "|".join([
        hospital_id,
        doctor_id,
        str(weekday),
        session["period"],
        session["room"],
        session["category"],
    ])


def slug(value: str) -> str:
    return "".join(char for char in value if char.isalnum()) or "item"


def build_change_report(schedule_path: Path, baseline_path: Path) -> dict:
    schedule = json.loads(schedule_path.read_text(encoding="utf-8"))
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    source = schedule.get("source", {})
    hospital_id = source.get("hospitalId", "")

    current = {
        session_key(hospital_id, session): session
        for session in schedule.get("sessions", [])
    }
    verifications = baseline.get("verifications", {})
    baseline_keys = set(verifications)
    current_keys = set(current)

    added = sorted(current_keys - baseline_keys)
    removed = sorted(baseline_keys - current_keys)
    unchanged = sorted(current_keys & baseline_keys)
    status_counts: dict[str, int] = {"added": len(added), "removed": len(removed)}

    for key in unchanged:
        status = verifications[key].get("status", "pending")
        status_counts[status] = status_counts.get(status, 0) + 1

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "schedule": str(schedule_path),
        "baseline": str(baseline_path),
        "source": source,
        "summary": status_counts,
        "added": [session_payload(key, current[key], source, "added") for key in added],
        "removed": [removed_payload(key, baseline, "removed") for key in removed],
        "unchanged": [
            session_payload(key, current[key], source, verifications[key].get("status", "pending"), verifications[key])
            for key in unchanged
        ],
    }


def session_payload(key: str, session: dict, source: dict, status: str, verification: dict | None = None) -> dict:
    return {
        "key": key,
        "status": status,
        "hospital": f"{source.get('hospitalName', '')} {source.get('branch', '')}".strip(),
        "department": session.get("category", session.get("department", "")),
        "doctor": session.get("doctorName", ""),
        "weekday": f"星期{['日', '一', '二', '三', '四', '五', '六'][session['weekdays'][0]]}",
        "period": session.get("period", ""),
        "room": session.get("room", ""),
        "sourcePage": session.get("sourcePage", ""),
        "sourceUrl": source.get("pageUrl") or source.get("pdfUrl") or "",
        "verification": verification or {"status": status, "note": ""},
    }


def removed_payload(key: str, baseline: dict, status: str) -> dict:
    item = next((entry for entry in baseline.get("items", []) if entry.get("key") == key), {})
    return {
        **item,
        "status": status,
        "verification": item.get("verification", {"status": status, "note": ""}),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare schedule JSON with validation baseline.")
    parser.add_argument("--schedule", default="data/okayama.json")
    parser.add_argument("--baseline", default="data/validation-baseline.json")
    parser.add_argument("--output", default="data/change-report.json")
    args = parser.parse_args()

    report = build_change_report(Path(args.schedule), Path(args.baseline))
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
