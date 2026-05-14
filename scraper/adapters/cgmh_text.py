from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime

import fitz
import httpx

from adapters.base import RawSchedule, ScheduleAdapter


WEEKDAY_COLUMNS = [
    (1, "上午", 152, 203),
    (1, "下午", 203, 254),
    (2, "上午", 254, 305),
    (2, "下午", 305, 356),
    (3, "上午", 356, 407),
    (3, "下午", 407, 458),
    (4, "上午", 458, 509),
    (4, "下午", 509, 560),
    (5, "上午", 560, 611),
    (5, "下午", 611, 662),
    (6, "上午", 662, 713),
]

DOCTOR_CODE_PATTERN = re.compile(
    r"[#＃◎▲△]?\s*(?:\d{5}|[A-Z]\d{4}|\dJ\d{3}|J\d{4})\s*([\u4e00-\u9fff]{2,4})"
)
NOTE_PATTERN = re.compile(r"[（(]([^（）()]{2,30})[）)]")
NOISE_WORDS = {
    "日期",
    "科別",
    "棟別",
    "樓別",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
    "上午",
    "下午",
    "本院宗旨",
    "醫務快訊",
}


@dataclass(frozen=True)
class TextWord:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    block: int
    line: int
    word: int

    @property
    def cx(self) -> float:
        return (self.x0 + self.x1) / 2


@dataclass(frozen=True)
class Anchor:
    y: float
    text: str


@dataclass(frozen=True)
class ScheduleText:
    x0: float
    y0: float
    cx: float
    text: str


class CgmhTextAdapter(ScheduleAdapter):
    def fetch(self) -> list[RawSchedule]:
        response = httpx.get(self.source.schedule_url, timeout=60, follow_redirects=True)
        response.raise_for_status()
        doc = fitz.open(stream=response.content, filetype="pdf")

        items: list[RawSchedule] = []
        parsed_at = datetime.now(UTC).isoformat()
        for page_index, page in enumerate(doc, start=1):
            words = [
                TextWord(
                    x0=word[0],
                    y0=word[1],
                    x1=word[2],
                    y1=word[3],
                    text=word[4],
                    block=word[5],
                    line=word[6],
                    word=word[7],
                )
                for word in page.get_text("words")
            ]
            if not is_schedule_page(words):
                continue

            department_anchors = build_department_anchors(words)
            room_anchors = build_room_anchors(words)
            for cell_text in build_schedule_texts(words):
                column = column_for_x(cell_text.cx)
                doctors = extract_doctors(cell_text.text)
                if not doctors:
                    continue

                department = nearest_anchor(department_anchors, cell_text.y0)
                room = nearest_anchor(room_anchors, cell_text.y0) or "未標示樓層"
                if not department:
                    continue

                weekday, period = column
                for doctor_name, note in doctors:
                    items.append(
                        RawSchedule(
                            hospital_id=self.source.id,
                            hospital_name=self.source.hospital_name,
                            branch_name=self.source.branch_name,
                            department=department,
                            doctor_name=doctor_name,
                            weekday=weekday,
                            weekday_label=f"星期{weekday_label(weekday)}",
                            period=period,
                            room=room,
                            source_url=self.source.schedule_url,
                            source_ref=f"pdf_page:{page_index};x:{cell_text.x0:.1f};y:{cell_text.y0:.1f}",
                            confidence=0.9,
                            note=note,
                            raw_text=cell_text.text,
                            source_page=page_index,
                            parsed_at=parsed_at,
                        )
                    )
        return dedupe(items)


def is_schedule_page(words: list[TextWord]) -> bool:
    text = "".join(word.text for word in words[:300])
    top_grid_text = "".join(word.text for word in words if 140 <= word.x0 <= 715 and word.y0 <= 150)
    return "科別" in text and "星期一" in top_grid_text and "星期六" in top_grid_text


def build_department_anchors(words: list[TextWord]) -> list[Anchor]:
    blocks: dict[int, list[TextWord]] = {}
    for word in words:
        if not (36 <= word.x0 <= 126 and word.y0 >= 95):
            continue
        blocks.setdefault(word.block, []).append(word)

    anchors: list[Anchor] = []
    for block_words in blocks.values():
        label = normalize_label("".join(word.text for word in sorted(block_words, key=lambda item: (item.y0, item.x0))))
        if not is_department_label(label):
            continue
        anchors.append(Anchor(y=min(word.y0 for word in block_words), text=label))
    return sorted(anchors, key=lambda item: item.y)


def build_schedule_texts(words: list[TextWord]) -> list[ScheduleText]:
    groups: dict[tuple[int, int, int, str], list[TextWord]] = {}
    for word in words:
        if word.y0 < 95 or word.x0 < 150 or word.x0 > 715:
            continue
        column = column_for_x(word.cx)
        if not column:
            continue
        key = (word.block, word.line, column[0], column[1])
        groups.setdefault(key, []).append(word)

    cells: list[ScheduleText] = []
    for group_words in groups.values():
        ordered = sorted(group_words, key=lambda item: item.x0)
        text = "".join(word.text for word in ordered)
        if not text:
            continue
        cells.append(
            ScheduleText(
                x0=min(word.x0 for word in ordered),
                y0=min(word.y0 for word in ordered),
                cx=(min(word.x0 for word in ordered) + max(word.x1 for word in ordered)) / 2,
                text=text,
            )
        )
    return sorted(cells, key=lambda item: (item.y0, item.x0))


def build_room_anchors(words: list[TextWord]) -> list[Anchor]:
    blocks: dict[int, list[TextWord]] = {}
    for word in words:
        if not (126 <= word.x0 <= 152 and word.y0 >= 95):
            continue
        blocks.setdefault(word.block, []).append(word)

    anchors: list[Anchor] = []
    for block_words in blocks.values():
        label = normalize_room("".join(word.text for word in sorted(block_words, key=lambda item: (item.y0, item.x0))))
        if not label:
            continue
        anchors.append(Anchor(y=min(word.y0 for word in block_words), text=label))
    return sorted(anchors, key=lambda item: item.y)


def normalize_label(text: str) -> str:
    label = re.sub(r"\s+", "", text)
    label = re.sub(r"[()（）]", "", label)
    label = label.replace("本院宗旨", "")
    label = re.sub(r"^[※●★]+", "", label)
    return label.strip()


def normalize_room(text: str) -> str:
    label = normalize_label(text)
    if not label:
        return ""
    label = re.sub(r"(?<!\d)\d{4,}(?!樓)", "", label)
    label = re.sub(r"(\D)\d+(樓)", r"\1\2", label)
    if label == "樓":
        return ""
    if "樓" not in label and "大樓" not in label:
        return ""
    label = label.replace("棟別", "").replace("樓別", "")
    if len(label) > 18:
        label = label[:18]
    return label


def is_department_label(label: str) -> bool:
    if not label or label in NOISE_WORDS:
        return False
    if len(label) < 2 or len(label) > 28:
        return False
    if any(token in label for token in ["日期", "星期", "上午", "下午", "宗旨", "下載", "電話"]):
        return False
    return any(token in label for token in ["科", "門診", "中心"])


def column_for_x(x: float) -> tuple[int, str] | None:
    for weekday, period, left, right in WEEKDAY_COLUMNS:
        if left <= x < right:
            return weekday, period
    return None


def nearest_anchor(anchors: list[Anchor], y: float) -> str:
    candidates = [anchor for anchor in anchors if anchor.y <= y + 3]
    if not candidates:
        if anchors and 0 < anchors[0].y - y <= 45:
            return anchors[0].text
        return ""
    return candidates[-1].text


def extract_doctors(text: str) -> list[tuple[str, str]]:
    raw = text.replace("\uf070", "▲")
    note = "；".join(dict.fromkeys(match.strip() for match in NOTE_PATTERN.findall(raw) if match.strip()))
    doctors: list[tuple[str, str]] = []
    seen: set[str] = set()
    for match in DOCTOR_CODE_PATTERN.finditer(raw):
        name = normalize_doctor_name(match.group(1))
        if not name or name in seen:
            continue
        seen.add(name)
        doctors.append((name, note))
    return doctors


def normalize_doctor_name(name: str) -> str:
    clean = re.sub(r"[^\u4e00-\u9fff]", "", name)
    if len(clean) < 2 or len(clean) > 4:
        return ""
    if any(token in clean for token in ["門診", "醫師", "醫學", "健康", "中心", "病科"]):
        return ""
    return clean


def weekday_label(weekday: int) -> str:
    return {1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六"}[weekday]


def dedupe(items: list[RawSchedule]) -> list[RawSchedule]:
    seen: set[tuple[str, str, str, int, str, str, str]] = set()
    unique: list[RawSchedule] = []
    for item in items:
        key = (
            item.hospital_id,
            item.department,
            item.doctor_name,
            item.weekday,
            item.period,
            item.room,
            item.raw_text,
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique
