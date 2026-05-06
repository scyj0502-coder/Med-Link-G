from __future__ import annotations

import argparse
import json
import re
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlretrieve

import fitz


PDF_URL = "https://www.kmuh.org.tw/include/lib/images/opd.pdf"
SOURCE_PAGE = "https://www.kmuh.org.tw/KMUHInterWeb/InterWeb/InnerPage/1001124048"
HOSPITAL_ID = "kmuh"
HOSPITAL_NAME = "高雄醫學大學附設中和紀念醫院"
HOSPITAL_BRANCH = "總院"
REGION = "高雄"
WEEKDAY_MAP = {
    "星期一": 1,
    "星期二": 2,
    "星期三": 3,
    "星期四": 4,
    "星期五": 5,
    "星期六": 6,
}
PERIODS = {"上午", "下午", "夜間"}
NAME_RE = re.compile(r"^[\u4e00-\u9fff·]{2,5}$")
CODE_RE = re.compile(r"\((\d{4})\)")


@dataclass(frozen=True)
class Word:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str


@dataclass(frozen=True)
class ClinicRow:
    y: float
    code: str
    clinic: str
    department: str
    category: str


def download_pdf(target: Path) -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    urlretrieve(PDF_URL, target)
    return target


def parse_pdf(pdf_path: Path) -> dict:
    doc = fitz.open(pdf_path)
    sessions = []
    clinic_rows = []

    for page_index in range(doc.page_count):
        text = doc[page_index].get_text("text")
        if "各科門診表" not in text:
            continue
        page_words = [
            Word(x0, y0, x1, y1, value)
            for x0, y0, x1, y1, value, *_ in doc[page_index].get_text("words")
        ]
        parsed_rows = extract_clinic_rows(page_words)
        clinic_rows.extend(parsed_rows)
        sessions.extend(extract_sessions(page_words, parsed_rows, page_index + 1))

    sessions = dedupe_sessions(sessions)
    doctors = build_doctors(sessions)
    departments = sorted({session["department"] for session in sessions})
    categories = sorted({session["category"] for session in sessions})
    raw_clinics = sorted({session["rawClinic"] for session in sessions})
    return {
        "source": {
            "hospitalId": HOSPITAL_ID,
            "hospitalName": HOSPITAL_NAME,
            "branch": HOSPITAL_BRANCH,
            "region": REGION,
            "pageUrl": SOURCE_PAGE,
            "pdfUrl": PDF_URL,
            "syncedAt": datetime.now(timezone.utc).isoformat(),
            "parser": "kmuh_sync.py",
            "quality": "pdf-text-extracted",
            "note": "第一版以官方 PDF 文字座標解析診別、時段、星期與醫師；特殊備註仍需後續校正。",
        },
        "categories": categories,
        "departments": departments,
        "rawClinics": raw_clinics,
        "doctors": doctors,
        "sessions": sessions,
        "stats": {
            "clinicRows": len({row.code for row in clinic_rows}),
            "categories": len(categories),
            "departments": len(departments),
            "rawClinics": len(raw_clinics),
            "doctors": len(doctors),
            "sessions": len(sessions),
        },
    }


def extract_sessions(words: list[Word], clinics: list[ClinicRow], page_number: int) -> list[dict]:
    sessions = []
    header_rows = find_header_rows(words)
    if not header_rows or not clinics:
        return sessions

    for header_y, day_columns in header_rows:
        next_header_y = min([y for y, _ in header_rows if y > header_y] or [850])
        group_clinics = [row for row in clinics if header_y < row.y < next_header_y]
        if not group_clinics:
            continue

        period_words = [
            word for word in words
            if 170 <= word.x0 <= 215 and header_y < word.y0 < next_header_y and word.text in PERIODS
        ]
        for period_word in period_words:
            clinic = clinic_for_y(group_clinics, period_word.y0)
            if clinic is None:
                continue
            for day_label, weekday, day_x in day_columns:
                doctor = doctor_at(words, day_x, period_word.y0)
                if not doctor:
                    continue
                period = "夜診" if period_word.text == "夜間" else period_word.text
                sessions.append({
                    "id": f"kmuh-{clinic.code}-{weekday}-{period}-{doctor}",
                    "hospitalId": HOSPITAL_ID,
                    "hospitalName": HOSPITAL_NAME,
                    "branch": HOSPITAL_BRANCH,
                    "region": REGION,
                    "department": clinic.department,
                    "clinic": clinic.clinic,
                    "rawClinic": clinic.clinic,
                    "category": clinic.category,
                    "clinicCode": clinic.code,
                    "doctorName": doctor,
                    "weekdays": [weekday],
                    "period": period,
                    "room": clinic.clinic,
                    "sourcePage": page_number,
                    "sourceWeekdayLabel": day_label,
                })
    return sessions


def find_header_rows(words: list[Word]) -> list[tuple[float, list[tuple[str, int, float]]]]:
    weekday_words = [
        word for word in words
        if word.text in WEEKDAY_MAP and word.x0 > 210
    ]
    rows: list[list[Word]] = []
    for word in sorted(weekday_words, key=lambda item: (item.y0, item.x0)):
        for row in rows:
            if abs(row[0].y0 - word.y0) <= 4:
                row.append(word)
                break
        else:
            rows.append([word])

    header_rows = []
    for row in rows:
        if len(row) < 3:
            continue
        columns = [
            (word.text, WEEKDAY_MAP[word.text], word.x0)
            for word in sorted(row, key=lambda item: item.x0)
        ]
        header_rows.append((min(word.y0 for word in row), columns))
    return header_rows


def extract_clinic_rows(words: list[Word]) -> list[ClinicRow]:
    left_words = [
        word for word in words
        if 45 <= word.x0 <= 180 and word.y0 > 95 and word.text not in {"備", "註"}
    ]
    lines = group_lines(left_words)
    rows = []
    for index, line in enumerate(lines):
        line_text = "".join(word.text for word in line)
        match = CODE_RE.search(line_text)
        if not match:
            continue
        label_parts = [CODE_RE.sub("", line_text)]
        cursor = index - 1
        while cursor >= 0 and len("".join(label_parts)) < 16:
            previous_text = "".join(word.text for word in lines[cursor])
            if CODE_RE.search(previous_text) or is_noise_line(previous_text):
                break
            label_parts.insert(0, previous_text)
            cursor -= 1
        clinic = clean_clinic_label("".join(label_parts))
        if not clinic:
            continue
        rows.append(ClinicRow(
            y=min(word.y0 for word in line),
            code=match.group(1),
            clinic=clinic,
            department=normalize_department(clinic),
            category=normalize_category(clinic),
        ))
    return dedupe_clinic_rows(rows)


def group_lines(words: list[Word]) -> list[list[Word]]:
    lines: list[list[Word]] = []
    for word in sorted(words, key=lambda item: (item.y0, item.x0)):
        for line in lines:
            if abs(line[0].y0 - word.y0) <= 4:
                line.append(word)
                break
        else:
            lines.append([word])
    return [sorted(line, key=lambda item: item.x0) for line in lines]


def clinic_for_y(clinics: list[ClinicRow], y: float) -> ClinicRow | None:
    candidates = [clinic for clinic in clinics if clinic.y <= y + 4]
    if not candidates:
        return None
    return max(candidates, key=lambda row: row.y)


def doctor_at(words: list[Word], x: float, y: float) -> str | None:
    candidates = [
        word.text.strip()
        for word in words
        if abs(word.x0 - x) <= 24 and abs(word.y0 - y) <= 5
    ]
    for value in candidates:
        if is_doctor_name(value):
            return value.replace("　", "")
    return None


def is_doctor_name(value: str) -> bool:
    if value in WEEKDAY_MAP or value in PERIODS:
        return False
    if any(token in value for token in ["診", "科", "門", "樓", "棟", "地點", "含"]):
        return False
    return bool(NAME_RE.match(value))


def is_noise_line(value: str) -> bool:
    return any(token in value for token in ["備註", "看診地點", "欲查詢", "限醫師", "含", "門診區"])


def clean_clinic_label(value: str) -> str:
    value = CODE_RE.sub("", value)
    value = re.sub(r"（.*?）|\(.*?\)", "", value)
    value = re.sub(r"【.*?】", "", value)
    value = value.replace("診別", "").replace("診間", "")
    value = value.replace(" ", "").replace("　", "")
    value = re.sub(r"^(上午|下午|夜間|時段)+", "", value)
    value = re.sub(r"(上午|下午|夜間)+$", "", value)
    return value.strip("・:：")


def normalize_department(clinic: str) -> str:
    value = clinic
    value = re.sub(r"【.*?】", "", value)
    value = re.sub(r"^(上午|下午|夜間|時段)+", "", value)
    value = re.sub(r"(上午|下午|夜間)+$", "", value)
    value = re.sub(r"(上午|下午|夜間)+", "", value)
    value = value.replace("此診9:30開始", "")
    value = value.replace("此診上午診9:30開始", "")
    value = value.replace("卡介苗接種於週一下午", "")
    value = value.replace("限掛十名", "")
    value = re.sub(r"[一二三四五六七八九十１２３４５６７８９0-9]+診$", "", value)
    value = value.replace("一診", "").replace("二診", "").replace("三診", "")
    value = value.replace("四診", "").replace("五診", "").replace("六診", "")
    value = value.replace("七診", "").replace("八診", "")
    value = value.replace("門診", "")
    value = value.replace("教學", "教學門診")
    if value.endswith("科部"):
        value = value[:-1]
    if "家庭醫學科" in value:
        value = "家庭醫學科"
    if "整形外科" in value:
        value = "整形外科"
    if "一般外科" in value and "胃腸" not in value:
        value = "一般外科"
    if "胃腸及一般外科" in value:
        value = "胃腸及一般外科"
    if "大腸直腸" in value:
        value = "大腸直腸肛門外科"
    if "肝膽胰外科" in value:
        value = "肝膽胰外科"
    if "婦女乳房" in value:
        value = "婦女乳房外科"
    if "小兒外科" in value:
        value = "小兒外科"
    if "疼痛" in value:
        value = "疼痛科"
    if "一般小兒科" in value:
        value = "一般小兒科"
    if "新生兒科" in value:
        value = "新生兒科"
    return value or clinic


def normalize_category(clinic: str) -> str:
    clean = normalize_department(clinic)
    rules = [
        ("內分泌新陳代謝內科", ["內分泌", "糖尿病"]),
        ("胸腔內科", ["胸腔內科"]),
        ("腎臟內科", ["腎臟內科"]),
        ("感染內科", ["感染內科", "熱帶疾病", "登革熱"]),
        ("心臟血管內科", ["心臟血管內科", "心臟內科"]),
        ("胃腸內科", ["胃腸內科"]),
        ("肝膽胰內科", ["肝膽胰內科"]),
        ("血液腫瘤內科", ["血液腫瘤"]),
        ("過敏免疫風濕內科", ["過敏免疫風濕"]),
        ("一般醫學內科", ["一般醫學內科", "三高整合", "高齡醫學", "老年醫學"]),
        ("一般外科", ["一般外科", "一般醫學外科"]),
        ("整形外科", ["整形外科", "高壓氧"]),
        ("胸腔食道外科", ["胸腔食道外科"]),
        ("胃腸及一般外科", ["胃腸及一般外科"]),
        ("肝膽胰外科", ["肝膽胰外科", "肝臟移植"]),
        ("大腸直腸肛門外科", ["大腸直腸", "胃腸、大腸"]),
        ("乳房外科", ["婦女乳房", "乳房腫瘤", "甲狀腺腫瘤"]),
        ("小兒外科", ["小兒外科"]),
        ("婦產科", ["婦產科"]),
        ("小兒科", ["一般小兒科", "新生兒科", "小兒神經", "小兒血液", "特殊血液病", "兒童發展"]),
        ("皮膚科", ["皮膚科"]),
        ("骨科", ["骨科"]),
        ("腦神經內科", ["腦神經內科", "神經肌肉"]),
        ("泌尿科", ["泌尿科", "性功能障礙"]),
        ("疼痛科", ["疼痛科"]),
        ("眼科", ["眼科"]),
        ("耳鼻喉頭頸科", ["耳鼻"]),
        ("放射腫瘤科", ["放射腫瘤"]),
        ("家庭醫學科", ["家庭醫學科", "家醫科", "自費減重", "職業暨環境"]),
        ("安寧共同照護", ["安寧"]),
        ("營養門診", ["營養"]),
        ("復健科", ["復健科"]),
        ("精神科", ["精神科", "青少年"]),
        ("中醫部", ["中醫"]),
        ("牙科部", ["牙科"]),
        ("癌症中心", ["癌症", "新藥臨床試驗", "高杏", "國際醫療", "腫瘤"]),
    ]
    for category, keywords in rules:
        if any(keyword in clean for keyword in keywords):
            return category
    return clean


def dedupe_clinic_rows(rows: list[ClinicRow]) -> list[ClinicRow]:
    seen = set()
    result = []
    for row in sorted(rows, key=lambda item: (item.y, item.code)):
        key = (round(row.y, 1), row.code, row.clinic)
        if key in seen:
            continue
        seen.add(key)
        result.append(row)
    return result


def dedupe_sessions(sessions: list[dict]) -> list[dict]:
    seen = set()
    result = []
    for session in sessions:
        key = (
            session["hospitalId"],
            session["clinicCode"],
            tuple(session["weekdays"]),
            session["period"],
            session["doctorName"],
        )
        if key in seen:
            continue
        seen.add(key)
        result.append(session)
    return sorted(result, key=lambda item: (item["department"], item["clinicCode"], item["weekdays"], item["period"], item["doctorName"]))


def build_doctors(sessions: list[dict]) -> list[dict]:
    doctors = {}
    for session in sessions:
        key = (session["doctorName"], session["department"])
        doctors[key] = {
            "id": f"kmuh-{slug(session['doctorName'])}-{slug(session['department'])}",
            "hospitalId": HOSPITAL_ID,
            "name": session["doctorName"],
            "department": session["category"],
            "rawDepartment": session["department"],
            "rawClinic": session["rawClinic"],
            "specialty": f"{session['department']}門診",
        }
    return sorted(doctors.values(), key=lambda item: (item["department"], item["name"]))


def slug(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", "", value)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync KMUH outpatient schedule PDF into JSON.")
    parser.add_argument("--output", default="data/kmuh.json")
    parser.add_argument("--pdf", default="")
    args = parser.parse_args()

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    if args.pdf:
        pdf_path = Path(args.pdf)
    else:
        pdf_path = Path(tempfile.gettempdir()) / "kmuh-opd.pdf"
        download_pdf(pdf_path)

    payload = parse_pdf(pdf_path)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {output} with {payload['stats']}")


if __name__ == "__main__":
    main()
