from __future__ import annotations

import io
import hashlib
import os
import re
from difflib import SequenceMatcher
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin

import fitz
import httpx
from bs4 import BeautifulSoup
from PIL import Image

from adapters.base import RawSchedule, ScheduleAdapter
from adapters.edah_pdf import ocr_base_crop


LIST_URL = "https://www.pntn.mohw.gov.tw/?aid=602&iid=2"
WEEKDAY_COLUMNS = [
    (1, "星期一", 308, 424),
    (2, "星期二", 424, 539),
    (3, "星期三", 539, 654),
    (4, "星期四", 654, 769),
    (5, "星期五", 769, 884),
    (6, "星期六", 884, 1002),
]
LEFT_COLUMNS = {
    "department": (68, 154),
    "shift": (154, 206),
    "location": (206, 257),
    "room": (257, 308),
}
TABLE_X_RANGE = (60, 1015)
TABLE_Y_RANGE = (130, 1490)
DOCTOR_PATTERN = re.compile(r"([\u4e00-\u9fff]{2,5})\s*(?:[O0]?\d{3,4})")
NOTE_PATTERN = re.compile(r"[（(]([^）)]+)[）)]")
SHIFT_SEQUENCE = ["上午", "下午", "黃昏"]


DEPARTMENT_ALIASES = {
    "一般科": ["一般科"],
    "神經科": ["神經科", "神內經科", "神內", "經科"],
    "心臟科": ["心臟科", "心內臟科", "心內"],
    "肝膽胰腸胃內科": ["肝膽胰腸胃內科", "肝膽胰", "腸胃內科"],
    "營養諮詢": ["營養諮詢", "營養"],
    "內分泌新陳代謝科": ["內分泌新陳代謝科", "新陳代謝科"],
    "胸腔內科": ["胸腔內科", "胸腔內"],
    "感染科": ["感染科"],
    "腎臟內科": ["腎臟內科", "腎臟內"],
    "腫瘤科": ["腫瘤科"],
    "血液科": ["血液科"],
    "家醫科": ["家醫科"],
    "職業醫學科": ["職業醫學科"],
    "一般消化外科": ["一般消化外科", "一般及消化外科", "消化外科"],
    "乳房外科": ["乳房外科"],
    "大腸直腸肛門外科": ["大腸直腸肛門外科", "大腸直腸", "肛門外科"],
    "泌尿科": ["泌尿科"],
}
PAGE_DEPARTMENT_SPANS = {
    1: [
        (198, 400, "一般科"),
        (400, 669, "神經科"),
        (669, 939, "心臟科"),
        (939, 1208, "肝膽胰腸胃內科"),
        (1208, 1276, "營養諮詢"),
        (1276, 1478, "內分泌新陳代謝科"),
    ],
    2: [
        (196, 578, "胸腔內科"),
        (578, 770, "感染科"),
        (770, 1025, "腎臟內科"),
        (1025, 1152, "腫瘤科"),
        (1152, 1407, "家醫科"),
        (1407, 1470, "職業醫學科"),
    ],
    3: [
        (198, 629, "一般消化外科"),
        (629, 1138, "乳房外科"),
        (1138, 1467, "泌尿科"),
    ],
    4: [
        (195, 562, "骨科"),
        (562, 807, "神經外科"),
        (807, 990, "心臟血管外科"),
        (990, 1296, "整形外科"),
        (1296, 1472, "胸腔外科"),
    ],
    5: [
        (195, 378, "兒科"),
        (378, 562, "婦產科"),
        (562, 684, "婦癌專科"),
        (684, 868, "耳鼻喉科"),
        (868, 990, "眼科"),
        (990, 1472, "牙科"),
    ],
    6: [
        (195, 379, "皮膚科"),
        (379, 623, "精神科"),
        (623, 746, "替代療法"),
        (746, 990, "復健科"),
        (990, 1327, "戒菸特別門診"),
        (1327, 1470, "M痘疫苗"),
    ],
    7: [
        (144, 308, "疼痛科"),
        (308, 424, "高壓氧特別門診"),
        (424, 541, "放射腫瘤科"),
        (541, 599, "安寧特別門診"),
        (599, 658, "預立醫療照護諮商門診"),
        (658, 891, "中醫科"),
    ],
}
PAGE_ROOM_SPANS = {
    1: [
        (198, 400, "於原專科診間"),
        (400, 467, "一診12"),
        (467, 534, "二診14"),
        (534, 669, "一診12"),
        (939, 1006, "一診10"),
        (1006, 1074, "二診11"),
        (1074, 1141, "一診10"),
        (1141, 1208, "一診10 / 二診11"),
        (1208, 1276, "一診11"),
        (1276, 1478, "一診13"),
    ],
    2: [
        (196, 260, "一診7"),
        (260, 324, "二診8"),
        (324, 388, "一診7"),
        (388, 451, "二診8"),
        (451, 515, "一診8"),
        (515, 578, "一診7"),
        (578, 770, "一診9"),
        (770, 897, "一診17"),
        (897, 961, "二診18"),
        (961, 1025, "一診17"),
        (1025, 1152, "一診55"),
        (1152, 1280, "一診36"),
        (1280, 1407, "二診37"),
        (1407, 1470, "一診36"),
    ],
    4: [
        (195, 256, "一診29"),
        (256, 318, "二診28"),
        (318, 379, "三診27"),
        (379, 562, "一診29 / 二診28 / 三診27"),
        (562, 746, "一診19 / 二診18"),
        (746, 807, "一診19"),
        (807, 990, "一診33"),
        (990, 1296, "一診35"),
        (1296, 1472, "一診21"),
    ],
    5: [
        (193, 314, "一診22"),
        (314, 374, "二診3"),
        (435, 556, "一診32"),
        (616, 676, "一診33"),
        (737, 858, "一診16"),
        (980, 1040, "一診1"),
        (1040, 1100, "一診2"),
        (1100, 1161, "二診2"),
        (1161, 1221, "三診2"),
        (1221, 1282, "四診2"),
        (1282, 1342, "二診2"),
        (1342, 1403, "三診2"),
        (1403, 1466, "四診2"),
    ],
    6: [
        (195, 379, "一診34"),
        (397, 464, "一診24"),
        (464, 532, "二診23"),
        (532, 666, "一診24"),
        (666, 746, "一診50"),
        (800, 990, "一診38"),
        (1002, 1070, "一診36"),
        (1070, 1137, "一診24 / 二診7"),
        (1137, 1204, "一診37"),
        (1204, 1327, "二診7"),
        (1338, 1470, "一診9"),
    ],
    7: [
        (144, 308, "一診51"),
        (308, 424, "一診35"),
        (424, 541, "一診54"),
        (541, 599, "一診37"),
        (599, 658, "一診37"),
        (658, 774, "一診52 / 二診53"),
        (774, 891, "一診52"),
    ],
}
PAGE_SHIFT_SPANS = {
    4: [
        (195, 379, "上午"),
        (379, 562, "下午"),
        (562, 746, "上午"),
        (746, 807, "下午"),
        (807, 929, "上午"),
        (929, 990, "下午"),
        (990, 1113, "上午"),
        (1113, 1296, "下午"),
        (1296, 1358, "上午"),
        (1358, 1418, "下午"),
        (1418, 1472, "黃昏"),
    ],
    7: [
        (144, 249, "上午"),
        (249, 308, "下午"),
        (308, 366, "上午"),
        (366, 424, "下午"),
        (424, 482, "上午"),
        (482, 541, "下午"),
        (541, 599, "下午"),
        (599, 658, "下午"),
        (658, 774, "上午"),
        (774, 833, "下午"),
        (833, 891, "黃昏"),
    ],
}

KNOWN_DOCTORS_BY_DEPARTMENT = {
    "一般科": {"謝易倫", "柯亞倫", "郭晉宏", "葉東奇", "輪值醫師"},
    "神經科": {"林峰正", "沈聖偉", "林勛章", "許毓昀", "宋允文", "林煥然"},
    "心臟科": {"李孟光", "林新進", "朱俊源", "李智雄", "陳力瀚", "林詩晴"},
    "肝膽胰腸胃內科": {"張庭遠", "謝易倫", "劉大維", "陳震勛", "葉俊余", "莊沛霖", "盧建宇"},
    "營養諮詢": {"陳震勛"},
    "內分泌新陳代謝科": {"林昆正", "周炳全", "莊立倫"},
    "胸腔內科": {"涂聖葳", "王文育", "鄭孟軒", "葉東奇", "范勝斌", "沈昱廷"},
    "感染科": {"郭政諭", "李侑勳", "洪子倫"},
    "腎臟內科": {"鍾承穎", "趙祐麟", "蘇威宇"},
    "腫瘤科": {"柯亞倫", "黃炯棠"},
    "血液科": {"柯亞倫", "黃炯棠"},
    "家醫科": {"林直", "許禮安", "李俊德"},
    "職業醫學科": {"何原彰"},
    "一般消化外科": {"黃超俊", "盧文益", "蔡文豪", "黃鵬仁", "陳臨安", "楊博翔", "王森稔"},
    "乳房外科": {"高捷妮", "莊捷翰", "高聖鈞", "楊博翔", "黃超俊", "盧文益", "蔡文豪", "黃鵬仁"},
    "大腸直腸肛門外科": {"黃超俊", "盧文益", "楊博翔"},
    "泌尿科": {"李威明", "劉家駒", "張哲維", "陳震亞", "張君愷", "李明儒"},
    "骨科": {"張德華", "蘇裕捷", "陳姝蓉", "楊琮誠", "高建生", "張中嘉", "洪錫明", "簡松雄", "鄭裕民"},
    "神經外科": {"吳宗勳", "李昆興", "于大智", "張家茂", "張書瀚"},
    "心臟血管外科": {"黃建偉", "吳欣岱", "陳懷民", "陳英富", "謝炯昭"},
    "整形外科": {"林治邦", "盧道覺"},
    "胸腔外科": {"顏凡偉", "周世華", "李瑞英"},
    "兒科": {"蕭筑元", "林長興"},
    "婦產科": {"魏福茂", "楊曜瑜", "唐達翔"},
    "婦癌專科": {"黃富仁"},
    "耳鼻喉科": {"宋安", "鄭凱元", "林佳志", "姜志群"},
    "眼科": {"詹韶恩", "陳怡先", "鄭凱畿"},
    "牙科": {"鄭緯和", "陳怡頡", "游智凱", "周映瑜", "蘇泓瑋", "葉先倫", "洪宇翰", "魏家銓", "邱恩郁"},
    "皮膚科": {"曾慧文", "王暉景", "陳泱伊", "張瑞朝", "楊亭亨"},
    "精神科": {"田鴻誠", "林懷道", "陳弘仁"},
    "替代療法": {"陳弘仁", "田鴻誠"},
    "復健科": {"陳爾駿", "周嘉駿", "林政緯", "李志明"},
    "戒菸特別門診": {"林直", "李俊德", "陳弘仁", "沈昱廷", "鄭孟軒", "王文育", "葉東奇", "郭政諭", "李侑勳", "洪子倫"},
    "M痘疫苗": {"郭政諭", "李侑勳", "洪子倫"},
    "疼痛科": {"彭之祥"},
    "高壓氧特別門診": {"林治邦"},
    "放射腫瘤科": {"白立柱", "陳韋廷"},
    "安寧特別門診": {"郭晉宏"},
    "預立醫療照護諮商門診": {"郭晉宏"},
    "中醫科": {"林婉容", "許惠菁"},
}
OCR_DOCTOR_CORRECTIONS = {
    "謝映倒": "謝易倫",
    "謝暢倫": "謝易倫",
    "訌臣倫": "柯亞倫",
    "柯臣倫": "柯亞倫",
    "訌臣巨": "柯亞倫",
    "扁青": "柯亞倫",
    "郭晉宏巨": "郭晉宏",
    "郭翠宏": "郭晉宏",
    "悖東奇": "葉東奇",
    "葉柬奇": "葉東奇",
    "林鏗正": "林峰正",
    "林鋸正": "林峰正",
    "林鯨正": "林峰正",
    "木勳": "林勛章",
    "恤聖偉": "沈聖偉",
    "忸勳章": "林勛章",
    "忸勳章刪": "林勛章",
    "忸毓昀": "許毓昀",
    "忸毓昀唰": "許毓昀",
    "許毓昀唰": "許毓昀",
    "停毓昀": "許毓昀",
    "悖允文": "宋允文",
    "悖允文汀": "宋允文",
    "悖允文盯": "宋允文",
    "悖允文惻": "宋允文",
    "李孟兆": "李孟光",
    "朱俊沅": "朱俊源",
    "陳力瀚溯": "陳力瀚",
    "悖庭違唰": "張庭遠",
    "卜諶孟易": "謝易倫",
    "摯隹": "劉大維",
    "員主": "莊沛霖",
    "陳震勸": "陳震勛",
    "幃沛霖": "莊沛霖",
    "周炳坊": "周炳全",
    "囤炳金": "周炳全",
    "周炳金": "周炳全",
    "涂聖葭": "涂聖葳",
    "斗浹聖葉": "涂聖葳",
    "斗涂聖葳": "涂聖葳",
    "寸涂聖葳": "涂聖葳",
    "斗王文育": "王文育",
    "孟胄": "王文育",
    "王文背": "王文育",
    "鄭孟蘑于": "鄭孟軒",
    "葉构奇": "葉東奇",
    "斗葉构奇": "葉東奇",
    "斗葉東奇": "葉東奇",
    "芭勝斌": "范勝斌",
    "范腿斌": "范勝斌",
    "孔范腿斌": "范勝斌",
    "郭政諮": "郭政諭",
    "伸政諭咖": "郭政諭",
    "李侑勳咒": "李侑勳",
    "斗李侑勳": "李侑勳",
    "共子": "洪子倫",
    "鍾趕": "鍾承穎",
    "右町櫚": "趙祐麟",
    "蘇咸宇": "蘇威宇",
    "蘇威珪": "蘇威宇",
    "特炯棠叩": "黃炯棠",
    "黃鶩仁": "黃鵬仁",
    "黃鶘": "黃鵬仁",
    "蔡文墊": "蔡文豪",
    "蔡文據": "蔡文豪",
    "愫文豪胤": "蔡文豪",
    "悟文裏臂": "蔡文豪",
    "陳臨二": "陳臨安",
    "蘑棗臨": "陳臨安",
    "悖森稔刪": "王森稔",
    "楊博翥": "楊博翔",
    "專翔": "楊博翔",
    "幗搏翔": "楊博翔",
    "幗搏翔腮": "楊博翔",
    "恤榑翔岫": "楊博翔",
    "怖搏翔": "楊博翔",
    "怖搏翔惻": "楊博翔",
    "黃超傷": "黃超俊",
    "特鵬仁盯": "黃鵬仁",
    "忤威明惻": "李威明",
    "劉家駟": "劉家駒",
    "陳霽亞": "陳震亞",
    "忤晝彬岫": "張君愷",
    "忤農亞": "陳震亞",
    "張名維": "張哲維",
    "候裕捷": "蘇裕捷",
    "陳姝蕉": "陳姝蓉",
    "幃建生刪": "高建生",
    "洪鍚明": "洪錫明",
    "張中鳳": "張中嘉",
    "李屁興": "李昆興",
    "長家": "張家茂",
    "厂家茂刪": "張家茂",
    "張謹潮": "張書瀚",
    "圖江孟": "黃建偉",
    "陳英寰": "陳英富",
    "陳英空": "陳英富",
    "謝炵昭": "謝炯昭",
    "吳阪佑": "吳欣岱",
    "悖凡偉刪": "顏凡偉",
    "盧道覽": "盧道覺",
    "蹄筑元": "蕭筑元",
    "薯筑元": "蕭筑元",
    "林長腹": "林長興",
    "醜諤茂": "魏福茂",
    "魏禦茂": "魏福茂",
    "奮昜曜": "楊曜瑜",
    "楊曜瑞": "楊曜瑜",
    "盲蓮翔": "唐達翔",
    "林荏志": "林佳志",
    "悍凱元馴": "鄭凱元",
    "蔦貰韋禾": "鄭緯和",
    "蔦鬢韋禾": "鄭緯和",
    "陳怡禦": "陳怡頡",
    "陳怡嗚": "陳怡頡",
    "陳怡禱": "陳怡頡",
    "葉先倒": "葉先倫",
    "洪乎翰": "洪宇翰",
    "魏家銜": "魏家銓",
    "魏家銑": "魏家銓",
    "惘緯和卹": "鄭緯和",
    "映瑞": "周映瑜",
    "幃怡頎岫": "陳怡頡",
    "幃宇翰岫": "洪宇翰",
    "當戇文": "曾慧文",
    "當蠶文": "曾慧文",
    "王暐黑": "王暉景",
    "陳波伊": "陳泱伊",
    "張璐朝": "張瑞朝",
    "蹇昜": "楊亭亨",
    "陳弛仁叩": "陳弘仁",
    "陳弱仁": "陳弘仁",
    "帽嘉驪岫": "周嘉駿",
    "周鷲騏": "周嘉駿",
    "伸熹駿唰": "周嘉駿",
    "林政諱刊": "林政緯",
    "林政循剛": "林政緯",
    "寸謇本": "林直",
    "悖俊德刪": "李俊德",
    "陳弗仁": "陳弘仁",
    "昱蔓庄": "沈昱廷",
    "忡孟軒珈": "鄭孟軒",
    "沈昱延": "沈昱廷",
    "悼政諭刪": "郭政諭",
    "伸政諭惻": "郭政諭",
    "李侑務": "李侑勳",
    "李侑勤": "李侑勳",
    "侖叩躋": "洪子倫",
    "彭之祭": "彭之祥",
    "彭志祭": "彭之祥",
    "忸治邦胤": "林治邦",
    "白必柱": "白立柱",
    "陳韓廷": "陳韋廷",
    "悖普宏腮": "郭晉宏",
    "普宏": "郭晉宏",
    "忙婉容刪": "林婉容",
    "恤婉容涮": "林婉容",
    "廿婉容馴": "林婉容",
    "許惟蕙": "許惠菁",
    "忙惠膏唧": "許惠菁",
    "惠蕁": "許惠菁",
    "惠舊": "許惠菁",
}


@dataclass
class RowContext:
    department: str = ""
    shift: str = ""
    location: str = ""
    room: str = ""


@dataclass
class ParsedCell:
    page_number: int
    row_index: int
    weekday: int
    weekday_label: str
    context: RowContext
    raw_text: str
    source_url: str


class PingtungMohwAdapter(ScheduleAdapter):
    """Parse Pingtung Hospital's scanned PDF with fixed table coordinates."""

    def fetch(self) -> list[RawSchedule]:
        schedules: list[RawSchedule] = []
        for cell in iter_schedule_cells(self.source.schedule_url):
            for doctor_name, note in extract_doctors(cell.raw_text, cell.context.department):
                schedules.append(
                    RawSchedule(
                        hospital_id=self.source.id,
                        hospital_name=self.source.hospital_name,
                        branch_name=self.source.branch_name,
                        department=cell.context.department,
                        doctor_name=doctor_name,
                        weekday=cell.weekday,
                        weekday_label=cell.weekday_label,
                        period=cell.context.shift,
                        room=cell.context.room or "未標示",
                        source_url=cell.source_url,
                        source_ref=f"pdf_page:{cell.page_number};row:{cell.row_index};weekday:{cell.weekday_label}",
                        confidence=0.87,
                        note=note,
                        raw_text=compact_text(cell.raw_text),
                        source_page=cell.page_number,
                    )
                )

        return dedupe(schedules)


def iter_schedule_cells(source_url: str) -> list[ParsedCell]:
    pdf_url = latest_pdf_url(source_url)
    pdf_bytes = httpx.get(pdf_url, timeout=60, follow_redirects=True).content
    document = fitz.open(stream=pdf_bytes, filetype="pdf")

    cells: list[ParsedCell] = []
    for page_index in range(len(document)):
        page = document[page_index]
        base_image = render_page(page, scale=2)
        ocr_image = render_page(page, scale=4)
        row_edges = detect_horizontal_grid_lines(base_image)
        if len(row_edges) < 3:
            continue

        shift_spans = detect_shift_spans(base_image)
        for row_index, (top, bottom) in enumerate(zip(row_edges, row_edges[1:]), start=0):
            if bottom - top < 25 or bottom > 1495:
                continue
            context = context_for_row(
                image=ocr_image,
                page_number=page_index + 1,
                top=top,
                bottom=bottom,
                shift_spans=shift_spans,
            )
            if not context.department or not context.shift:
                continue

            for weekday, weekday_label, left, right in WEEKDAY_COLUMNS:
                raw_text = ocr_crop(ocr_image, (left, top, right, bottom), psm="6")
                if not compact_text(raw_text):
                    continue
                cells.append(
                    ParsedCell(
                        page_number=page_index + 1,
                        row_index=row_index,
                        weekday=weekday,
                        weekday_label=weekday_label,
                        context=context,
                        raw_text=raw_text,
                        source_url=pdf_url,
                    )
                )
    return cells


def latest_pdf_url(source_url: str) -> str:
    if source_url.lower().endswith(".pdf"):
        return source_url
    response = httpx.get(source_url, timeout=60, follow_redirects=True)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    candidates: list[tuple[int, str]] = []
    for link in soup.find_all("a"):
        label = compact_text(link.get_text(" ", strip=True))
        href = link.get("href")
        if not href or "門診表" not in label or "pdf" not in label.lower():
            continue
        month_match = re.search(r"115年(\d+)月份", label)
        month = int(month_match.group(1)) if month_match else 0
        candidates.append((month, urljoin(source_url, href)))
    if not candidates:
        raise RuntimeError("No Pingtung Hospital schedule PDF link found.")
    return resolve_pdf_download_url(sorted(candidates, reverse=True)[0][1])


def resolve_pdf_download_url(download_page_url: str) -> str:
    response = httpx.get(download_page_url, timeout=60, follow_redirects=True)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "").lower()
    if "pdf" in content_type or response.content[:4] == b"%PDF":
        return str(response.url)
    soup = BeautifulSoup(response.text, "html.parser")
    for link in soup.find_all("a"):
        href = link.get("href") or ""
        label = compact_text(link.get_text(" ", strip=True))
        if ".pdf" in href.lower() or "pdf" in label.lower():
            return urljoin(str(response.url), href)
    raise RuntimeError("No direct PDF URL found on Pingtung Hospital download page.")


def render_page(page: fitz.Page, scale: int) -> Image.Image:
    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    return Image.open(io.BytesIO(pixmap.tobytes("png")))


def detect_horizontal_grid_lines(image: Image.Image) -> list[int]:
    red_rows: list[int] = []
    for y in range(TABLE_Y_RANGE[0], min(TABLE_Y_RANGE[1], image.height)):
        red_pixels = 0
        for x in range(TABLE_X_RANGE[0], min(TABLE_X_RANGE[1], image.width)):
            r, g, b = image.getpixel((x, y))[:3]
            if r > 150 and g < 130 and b < 150 and r > g + 40 and r > b + 40:
                red_pixels += 1
        if red_pixels > 300:
            red_rows.append(y)

    groups: list[list[int]] = []
    for y in red_rows:
        if not groups or y > groups[-1][-1] + 2:
            groups.append([])
        groups[-1].append(y)
    return [round(sum(group) / len(group)) for group in groups]


def detect_shift_spans(image: Image.Image) -> list[tuple[int, int]]:
    edges = detect_red_lines_in_column(image, LEFT_COLUMNS["shift"], threshold=25)
    return [(top, bottom) for top, bottom in zip(edges, edges[1:]) if bottom - top >= 25]


def detect_red_lines_in_column(image: Image.Image, column: tuple[int, int], threshold: int) -> list[int]:
    red_rows: list[int] = []
    left, right = column
    for y in range(TABLE_Y_RANGE[0], min(TABLE_Y_RANGE[1], image.height)):
        red_pixels = 0
        for x in range(left, right):
            r, g, b = image.getpixel((x, y))[:3]
            if r > 150 and g < 130 and b < 150 and r > g + 40 and r > b + 40:
                red_pixels += 1
        if red_pixels > threshold:
            red_rows.append(y)

    groups: list[list[int]] = []
    for y in red_rows:
        if not groups or y > groups[-1][-1] + 2:
            groups.append([])
        groups[-1].append(y)
    return [round(sum(group) / len(group)) for group in groups]


def context_for_row(
    image: Image.Image,
    page_number: int,
    top: int,
    bottom: int,
    shift_spans: list[tuple[int, int]],
) -> RowContext:
    department_span = department_span_for_row(page_number, top, bottom)
    if not department_span:
        return RowContext()
    department_top, department_bottom, department = department_span
    row_mid = (top + bottom) / 2
    spans_in_department = [
        span for span in shift_spans
        if span[0] >= department_top - 2 and span[1] <= department_bottom + 2
    ]
    shift = shift_override_for_row(page_number, top, bottom)
    for index, (shift_top, shift_bottom) in enumerate(spans_in_department):
        if not shift and shift_top <= row_mid <= shift_bottom:
            shift = SHIFT_SEQUENCE[min(index, len(SHIFT_SEQUENCE) - 1)]
            break

    location_text = ocr_crop(
        image,
        (LEFT_COLUMNS["location"][0], department_top, LEFT_COLUMNS["location"][1], department_bottom),
        psm="6",
    )
    room_text = ocr_crop(image, (LEFT_COLUMNS["room"][0], top, LEFT_COLUMNS["room"][1], bottom), psm="6")
    return RowContext(
        department=department,
        shift=shift,
        location=normalize_location(location_text),
        room=room_override_for_row(page_number, top, bottom) or normalize_room(room_text) or "未標示",
    )


def department_span_for_row(page_number: int, top: int, bottom: int) -> tuple[int, int, str] | None:
    row_mid = (top + bottom) / 2
    for span_top, span_bottom, department in PAGE_DEPARTMENT_SPANS.get(page_number, []):
        if span_top <= row_mid <= span_bottom:
            return span_top, span_bottom, department
    return None


def room_override_for_row(page_number: int, top: int, bottom: int) -> str:
    row_mid = (top + bottom) / 2
    for span_top, span_bottom, room in PAGE_ROOM_SPANS.get(page_number, []):
        if span_top <= row_mid <= span_bottom:
            return room
    return ""


def shift_override_for_row(page_number: int, top: int, bottom: int) -> str:
    row_mid = (top + bottom) / 2
    for span_top, span_bottom, shift in PAGE_SHIFT_SPANS.get(page_number, []):
        if span_top <= row_mid <= span_bottom:
            return shift
    return ""


def normalize_department(text: str) -> str:
    compact = compact_text(text)
    for department, aliases in DEPARTMENT_ALIASES.items():
        if any(alias in compact for alias in aliases):
            return department
    return ""


def normalize_shift(text: str) -> str:
    compact = compact_text(text)
    if "黃" in compact or "昏" in compact:
        return "黃昏"
    if "下" in compact or "午" in compact and "上" not in compact:
        return "下午"
    if "上" in compact or "午" in compact:
        return "上午"
    return ""


def normalize_location(text: str) -> str:
    compact = compact_text(text)
    if not compact:
        return ""
    if "復健" in compact:
        return "復健大樓2樓"
    if "醫療" in compact or "醫療大樓" in compact:
        return "醫療大樓2樓"
    if "放射" in compact:
        return "放射腫瘤中心"
    return compact[:12]


def normalize_room(text: str) -> str:
    compact = compact_text(text)
    squeezed = compact.replace(" ", "")
    if "於原" in squeezed or "專科診" in squeezed:
        return "於原專科診間"
    room_matches = re.findall(r"([一二三四五六七八九十])\s*[診詒詑誒肱胜訪][^\d]{0,8}(\d{1,2})", compact)
    if room_matches:
        rooms = [f"{prefix}診{number}" for prefix, number in room_matches]
        return " / ".join(dict.fromkeys(rooms))
    number_matches = re.findall(r"\b(\d{1,2})\b", compact)
    if number_matches:
        return f"診{number_matches[-1]}"
    return ""


def extract_doctors(text: str, department: str) -> list[tuple[str, str]]:
    raw = compact_text(text)
    if not raw:
        return []
    note = "；".join(dict.fromkeys(match.strip() for match in NOTE_PATTERN.findall(raw) if match.strip()))
    doctors: list[tuple[str, str]] = []
    seen: set[str] = set()
    for raw_name in doctor_name_candidates(raw):
        name = correct_doctor_name(raw_name, department)
        if not name or name in seen:
            continue
        seen.add(name)
        doctors.append((name, note))
    return doctors


def uncorrected_doctor_candidates(text: str, department: str) -> list[str]:
    candidates: list[str] = []
    seen: set[str] = set()
    for name in doctor_name_candidates(text):
        if correct_doctor_name(name, department):
            continue
        if name in seen:
            continue
        seen.add(name)
        candidates.append(name)
    return candidates


def doctor_name_candidates(text: str) -> list[str]:
    raw = compact_text(text)
    compact = "".join(raw.split())
    matches = list(DOCTOR_PATTERN.finditer(compact))
    matches.extend(
        match for match in re.finditer(r"([\u4e00-\u9fff]{2,5})[^\u4e00-\u9fff]{0,4}(?:[O0]?\d{2,4})", compact)
        if match not in matches
    )
    if not matches and not NOTE_PATTERN.search(raw):
        matches = [
            match for match in re.finditer(r"([\u4e00-\u9fff]{2,4})", compact)
            if not should_ignore_name(match.group(1))
        ]

    candidates: list[str] = []
    seen: set[str] = set()
    for match in matches:
        name = normalize_doctor_name(match.group(1))
        if not name or name in seen:
            continue
        seen.add(name)
        candidates.append(name)
    return candidates


def correct_doctor_name(name: str, department: str) -> str:
    if not name:
        return ""
    department_candidates = KNOWN_DOCTORS_BY_DEPARTMENT.get(department, set())
    if name in department_candidates:
        return name

    corrected = OCR_DOCTOR_CORRECTIONS.get(name)
    if corrected and (not department_candidates or corrected in department_candidates):
        return corrected

    best_name = ""
    best_score = 0.0
    for candidate in department_candidates:
        score = SequenceMatcher(None, name, candidate).ratio()
        if score > best_score:
            best_name = candidate
            best_score = score
    if best_score >= 0.67:
        return best_name

    return ""


def normalize_doctor_name(text: str) -> str:
    name = re.sub(r"[^\u4e00-\u9fff]", "", text)
    if len(name) > 4:
        name = name[-3:]
    if len(name) < 2 or len(name) > 4:
        return ""
    if should_ignore_name(name):
        return ""
    return name


def should_ignore_name(name: str) -> bool:
    ignored_tokens = [
        "星期",
        "上午",
        "下午",
        "黃昏",
        "門診",
        "醫師",
        "報到",
        "特診",
        "特詁",
        "特誥",
        "內科",
        "外科",
        "胸腔",
        "障礙",
        "結石",
        "排尿",
        "腺",
        "報到",
        "先盾診",
        "先翊診",
        "先看診",
        "先蒯認",
        "先罡誒",
        "特認",
        "特誒",
        "衛教",
        "衛教特別",
        "兒童發展",
        "小於七歲",
        "男性性",
        "高壓氫",
        "家醫科",
        "家醫种",
        "家醫",
        "兒童聯合",
        "評估",
        "評佑",
        "週二",
        "週五",
        "同齒",
        "口腔外",
        "美容手術",
        "歡迎諡詢",
        "腫瘤",
        "胛腔",
        "臺之發展",
        "撥打",
        "剛普普",
        "渡重門誒",
        "囤梁入",
        "壘喜",
        "岫坵華東",
        "睿薑方",
        "貴攫",
        "可棠",
        "侖硐馴",
        "睿蕈可",
        "荳哼",
        "門誒",
        "躉安",
        "齦囂盲",
        "斗一",
        "恬乃驊",
        "斗林盲",
        "睿昜",
        "鬘鑒",
        "高董里簧",
        "賣鸝",
        "骨貿華嚓",
        "先睜誒",
        "口人託心",
        "樣門註剷",
        "箕口自下",
        "空八小",
        "菫蠹",
        "克奚誒",
        "大眠症",
        "旳期",
        "診間看誒",
        "伸政諭咖",
        "鍾趕",
        "鍾承穎",
        "特炯棠叩",
    ]
    return any(token in name for token in ignored_tokens)


def ocr_crop(image: Image.Image, box: tuple[int, int, int, int], psm: str) -> str:
    cropped = image.crop(tuple(round(value * image.width / 1080) for value in box))
    if not cropped.width:
        return ""

    cache_dir = os.environ.get("MED_LINK_OCR_CACHE_DIR")
    if not cache_dir:
        return ocr_base_crop(image, box, psm=psm)

    cache_path = Path(cache_dir)
    cache_path.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha1()
    key.update(str((box, psm, cropped.size)).encode("utf-8"))
    key.update(cropped.tobytes())
    text_path = cache_path / f"{key.hexdigest()}.txt"
    if text_path.exists():
        return text_path.read_text(encoding="utf-8", errors="ignore")

    text = ocr_base_crop(image, box, psm=psm)
    text_path.write_text(text, encoding="utf-8")
    return text


def dedupe(items: list[RawSchedule]) -> list[RawSchedule]:
    seen: set[tuple[str, str, int, str, str]] = set()
    deduped: list[RawSchedule] = []
    for item in items:
        key = (item.department, item.doctor_name, item.weekday, item.period, item.room)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def compact_text(text: str) -> str:
    return " ".join(text.replace("\u3000", " ").split())
