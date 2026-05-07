from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


HOSPITAL_ID = "kmugh"
HOSPITAL_NAME = "高雄醫學大學附設醫院"
HOSPITAL_BRANCH = "岡山醫院"
REGION = "高雄"
SOURCE_URL = "https://www.kmugh.org.tw/web/kmugh/MedicalService/OPDSchedule"


WEEKDAYS = {
    "一": 1,
    "二": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
}


TARGET_ROWS = [
    {
        "department": "肝膽內科",
        "category": "肝膽內科",
        "rows": [
            ("0113", "上午", {"一": "謝明彥", "四": "魏鈺儒", "五": "陳信成"}),
            ("0114", "上午", {"五": "謝明彥"}),
            ("0113", "下午", {"二": "陳信成", "三": "梁博程", "五": "陳信成"}),
            ("0113", "夜診", {"一": "余明隆、戴嘉言", "三": "黃志富"}),
            ("0114", "夜診", {"三": "謝明彥"}),
        ],
        "note": "夜診時間 17:30~20:00。",
    },
    {
        "department": "心臟血管內科",
        "category": "心臟血管內科",
        "rows": [
            ("0107", "上午", {"一": "郭炫孚", "二": "林宗翰", "三": "李香君", "四": "高培恒", "五": "高培恒"}),
            ("0108", "上午", {"一": "高培恒", "二": "林宗憲"}),
            ("0107", "下午", {"一": "郭炫孚", "二": "林宗翰", "三": "郭炫孚", "四": "李柏瀚", "五": "高培恒"}),
            ("0108", "下午", {"一": "李香君", "二": "朱志生", "三": "林宗翰", "四": "吳韋聰", "五": "李柏瀚"}),
            ("0109", "下午", {"一": "顏學偉", "二": "顏學偉", "三": "顏學偉"}),
            ("0107", "夜診", {"三": "郭炫孚"}),
            ("0108", "夜診", {"五": "李柏瀚"}),
        ],
        "note": "心臟血管內科備註：先報到先看診；部分診次為限診或指定日期異動，仍以官網公告為準。",
    },
]


def build_payload() -> dict:
    sessions = []
    doctors = {}

    for group in TARGET_ROWS:
        department = group["department"]
        category = group["category"]
        for clinic_code, period, cells in group["rows"]:
            for weekday_label, names in cells.items():
                for name in [value.strip() for value in names.split("、") if value.strip()]:
                    doctor_key = (name, department)
                    doctor_id = f"kmugh-{slug(name)}-{slug(department)}"
                    doctors[doctor_key] = {
                        "id": doctor_id,
                        "hospitalId": HOSPITAL_ID,
                        "name": name,
                        "department": category,
                        "rawDepartment": department,
                        "rawClinic": department,
                        "specialty": f"{department}門診",
                    }
                    weekday = WEEKDAYS[weekday_label]
                    sessions.append({
                        "id": f"kmugh-{clinic_code}-{weekday}-{period}-{slug(name)}",
                        "hospitalId": HOSPITAL_ID,
                        "hospitalName": HOSPITAL_NAME,
                        "branch": HOSPITAL_BRANCH,
                        "region": REGION,
                        "department": department,
                        "clinic": department,
                        "rawClinic": department,
                        "category": category,
                        "clinicCode": clinic_code,
                        "doctorName": name,
                        "weekdays": [weekday],
                        "period": period,
                        "room": clinic_code,
                        "sourcePage": 8,
                        "sourceWeekdayLabel": f"星期{weekday_label}",
                        "note": group["note"],
                    })

    return {
        "source": {
            "hospitalId": HOSPITAL_ID,
            "hospitalName": HOSPITAL_NAME,
            "branch": HOSPITAL_BRANCH,
            "region": REGION,
            "pageUrl": SOURCE_URL,
            "pdfUrl": SOURCE_URL,
            "syncedAt": datetime.now(timezone.utc).isoformat(),
            "parser": "okayama_schedule.py",
            "quality": "ocr-assisted-page-8-target-extract",
            "note": "第一版先抽取來源清單指定科別：肝膽內科、心臟血管內科。表格來源為岡山 PDF 第 8 頁，後續會擴充全頁表格 OCR。",
        },
        "categories": sorted({row["category"] for row in TARGET_ROWS}),
        "departments": sorted({row["department"] for row in TARGET_ROWS}),
        "rawClinics": sorted({row["department"] for row in TARGET_ROWS}),
        "doctors": sorted(doctors.values(), key=lambda item: (item["department"], item["name"])),
        "sessions": sorted(sessions, key=lambda item: (item["department"], item["clinicCode"], item["weekdays"], item["period"], item["doctorName"])),
        "stats": {
            "departments": len(TARGET_ROWS),
            "doctors": len(doctors),
            "sessions": len(sessions),
        },
    }


def slug(value: str) -> str:
    return "".join(char for char in value if char.isalnum()) or "item"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build first Okayama target department schedule JSON.")
    parser.add_argument("--output", default="data/okayama.json")
    args = parser.parse_args()

    payload = build_payload()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload["stats"], ensure_ascii=False))


if __name__ == "__main__":
    main()
