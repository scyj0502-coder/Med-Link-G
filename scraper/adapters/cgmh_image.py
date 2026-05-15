from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import fitz
import httpx
from PIL import Image

from adapters.base import RawSchedule, ScheduleAdapter
from adapters.edah_pdf import ocr_base_crop


WEEKDAY_COLUMNS = [
    (1, "星期一", 269, 397),
    (2, "星期二", 397, 524),
    (3, "星期三", 524, 652),
    (4, "星期四", 652, 780),
    (5, "星期五", 780, 907),
    (6, "星期六", 907, 1035),
]
DEPARTMENT_BOX = (89, 0, 225, 0)
SHIFT_BOX = (225, 0, 269, 0)
TABLE_X_RANGE = (89, 1035)
DOCTOR_PATTERN = re.compile(r"[#＃◎▲△※]?\s*(?:[A-Z]?\d{4,5}|J\d{4}|[A-Z]\d{4})\s*([\u4e00-\u9fff]{2,4})")
NOTE_PATTERN = re.compile(r"[（(]([^（）()]{2,30})[）)]")
VALID_SHIFTS = {"上午", "下午", "夜間", "夜診", "晚上"}
DOCTOR_CORRECTIONS = {
    "蔡褲晏": "蔡青晏",
    "鄭又說": "鄭又誠",
    "漏柏霓": "潘柏霖",
    "張晃舀": "張晃智",
    "張國錮": "張國欽",
    "噌雅文": "蕭雅文",
    "郴仲課": "郭仲謙",
    "林客潤": "林宥潤",
    "花銓樂": "許銓榮",
    "蔡背璜": "蔡育璋",
    "許俊傣": "許俊傑",
    "許俊傣星": "許俊傑",
    "林岑絜": "林岑紘",
    "林岑絮": "林岑紘",
    "王鈴立": "王鈞立",
    "蔡鎧隅": "蔡鎧隆",
    "胡萬荒": "胡萬詳",
    "吳建鎮": "吳建堂",
    "李偉熊": "李偉豪",
    "藤牧奎": "蔡牧堯",
    "蔡牧奠": "蔡牧堯",
    "陳子岑": "陳子烈",
    "沈元瑤": "沈元璋",
    "王引仁": "王弘仁",
    "羅湖倫": "羅浩倫",
    "糠翋雄": "康智雄",
    "子宗玉": "于宗玉",
    "劉憲瑛": "劉惠瑛",
    "花燿丑": "莊耀吉",
    "沈元琦": "沈元璋",
    "蓀牧輿": "蔡牧堯",
    "陳子收": "陳子烈",
    "王弗仁": "王弘仁",
    "陳枸謊": "陳柏諺",
    "羅活倫": "羅浩倫",
    "石窄元": "石富元",
    "陳彥何": "陳彥佑",
    "春期六": "",
    "花鎔冢": "莊鎧豪",
    "都家經": "郭家豪",
    "蔡岳懺": "蔡岳儒",
    "一騙一": "",
    "蔡鍺隈": "蔡鎧隆",
    "李克釗": "李宗釗",
    "王命玫": "王皓平",
    "王除平": "王皓平",
    "王陣平": "王皓平",
    "王院平": "王皓平",
    "蔡胄樺": "蔡青樺",
    "藤裶橡": "蔡青樺",
    "蒯裶樺": "蔡青樺",
    "周違復": "周達復",
    "周遂復": "周達復",
    "周邃復": "周達復",
    "劉毓霍": "劉毓惠",
    "洪國禦": "洪國頡",
    "洪國禱": "洪國頡",
    "洪國稠": "洪國頡",
    "洪國顛": "洪國頡",
    "洪國褻": "洪國頡",
    "郭聖浴": "郭聖治",
    "松齊": "李齊",
    "林胄弗": "林育弘",
    "劉紡絕": "劉約維",
    "王世初": "王世和",
    "周聖怒": "周聖恩",
    "紀頭裕": "紀順裕",
    "國拐括": "",
    "一一": "",
    "劉毓寅": "劉毓惠",
    "毓寅": "劉毓惠",
    "林背弘": "林育弘",
    "林岐璨": "林岑紘",
    "林岐紘": "林岑紘",
    "郭家索": "郭家豪",
    "郴家紋": "郭家豪",
    "廖冠紙": "廖冠豪",
    "廖冠紋": "廖冠豪",
    "蔡含僑": "蔡岳儒",
    "脊阿引": "賴啟智",
    "命期一脊": "",
    "阿引": "賴啟智",
    "抽俊恃": "趙俊淵",
    "俊恃": "趙俊淵",
    "益日霓": "蔡明憲",
    "日霓": "蔡明憲",
    "陡男苫": "陳垂至",
    "男苫": "陳垂至",
    "妤蛟咐": "林新景",
    "蛟咐": "林新景",
    "妖名才": "林右才",
    "賴教羿": "賴啟智",
    "賴敏咐": "賴啟智",
    "陳淇瑯": "陳泳瑄",
    "陳泳塌": "陳泳瑄",
    "林新曖": "林新景",
    "羅嵇典": "羅盛典",
    "查建安": "柯建安",
    "查志宏峰": "查志宏",
    "楊咐輝": "楊明輝",
    "吳孟橇": "吳孟樵",
    "吳孩榚": "吳孟樵",
    "吳孟橙": "吳孟樵",
    "陳詩雷": "陳語霜",
    "陳語霈": "陳語霜",
    "姜臨字": "姜威宇",
    "林盜芝": "林盈芳",
    "余維泉": "余維泰",
    "余維淩": "余維泰",
    "余維淳": "余維泰",
    "去細洲": "王金洲",
    "去細洲一": "王金洲",
    "陳顆賽": "陳順勝",
    "陳暘明": "陳聰明",
    "黃教縉": "黃啟維",
    "陳順腿": "陳順勝",
    "黃鈺茄": "黃鈺茹",
    "黃鈺茵": "黃鈺茹",
    "票乃文": "蔡乃文",
    "張播沛": "張揚沛",
    "張撥涌": "張揚沛",
    "遜張撥涌": "張揚沛",
    "陳尖簣": "陳尚德",
    "陳尖簣侯": "陳尚德",
    "侯雕元": "侯雅元",
    "雕元": "侯雅元",
    "許恒碣": "許恒碩",
    "蔡宗稚": "蔡宗穎",
    "呂孟嵇": "呂孟嶺",
    "呂孟嵇顏": "呂孟嶺",
    "呂孟禱": "呂孟嶺",
    "類士翔": "顏士翔",
    "士翔": "顏士翔",
    "類士翔虧": "顏士翔",
    "虧諭德": "盧諭德",
    "諭德": "盧諭德",
    "林柏吻": "林柏君",
    "昂期八": "",
    "蓿菖晝": "",
    "昂期一張": "張雅婷",
    "雅婷": "張雅婷",
    "四鬘": "",
    "昌期八菫": "",
    "口振": "",
    "石窈元": "石富元",
    "石穹元": "石富元",
    "呂孟嶄": "呂孟嶺",
    "呂孟嶴": "呂孟嶺",
    "蔡胄璿": "蔡育璋",
    "王宋振": "王宏振",
    "林脈潤": "林宥潤",
    "王亭人": "王亮人",
    "洪理發": "洪琪發",
    "洪琪盤": "洪琪發",
    "李命": "李昱",
    "邱念睪": "邱念睦",
    "邱念陸": "邱念睦",
    "許昭雖": "許智維",
    "黃坵龍": "黃坤龍",
    "輻韻如": "賴韻如",
    "連題陞": "連顥庭",
    "連題庭": "連顥庭",
    "黃寮戇": "黃寬慧",
    "傅宏鈍": "傅宏鈞",
    "黃莉娠": "黃莉媜",
    "蓊坨龍": "黃坤龍",
    "陳匈仁": "陳智仁",
    "陳官編": "陳宜倫",
    "沈俊昆": "沈俊明",
    "洪碎蓮": "洪碧蓮",
    "黃恰寧": "黃怡寧",
    "林官君": "林宜君",
    "林隱彥": "林博彥",
    "部光盂": "郭光哲",
    "賂圣下一": "",
    "一騙": "",
    "忑陽內科": "",
    "一酷科": "",
    "減經內科": "",
    "邑巍婷": "",
    "心腸內科": "",
    "戛季": "",
    "菫潘儒內": "",
    "分泱科": "",
    "戛叢": "",
    "菖志腸內": "",
}
IGNORED_DOCTOR_NAMES = {"詮周", "訴唱", "診陶", "誥腕", "誌唱", "詮咐"}
KNOWN_DEPARTMENTS = [
    "一般內科",
    "胃腸肝膽科",
    "胸腔內科",
    "血液腫瘤科",
    "腎臟科",
    "內分泌暨新陳代謝科",
    "心臟內科",
    "神經內科",
    "家醫科",
    "感染科",
    "一般外科",
    "骨科",
    "泌尿科",
    "婦產科",
    "耳鼻喉科",
    "眼科",
    "皮膚科",
    "精神科",
    "復健科",
    "牙科",
    "泌尿科",
    "神經外科",
    "心臟血管外科",
    "胸腔外科",
    "整形外科",
    "大腸直腸肛門外科",
    "外傷科",
    "靜脈曲張門診",
    "乳房外科",
    "甲狀腺外科",
    "代謝減重手術門診",
    "乳房重建",
    "耳鼻喉科",
    "職業醫學科",
    "失智症門診",
    "骨科",
    "脊椎手術中心門診",
    "精神科",
    "身心治療特別門診",
    "婦產科",
    "產檢與高層次超音波",
    "兒童內科",
]
PAGE_SEGMENT_DEPARTMENTS = {
    2: ["一般內科", "胃腸肝膽科", "胸腔內科", "血液腫瘤科", "腎臟科", "內分泌暨新陳代謝科"],
    3: ["糖尿病衛教", "心臟內科", "風濕過敏免疫科", "感染醫學科", "法定感染症門診", "肺癌篩檢門診", "肌少症門診"],
    4: [
        "泌尿科",
        "神經外科",
        "心臟血管外科",
        "胸腔外科",
        "整形外科",
        "大腸直腸肛門外科",
        "大腸直腸肛門外科",
        "外傷科",
        "靜脈曲張門診",
        "一般外科",
        "乳房外科",
        "甲狀腺外科",
    ],
    5: [
        "代謝減重手術門診",
        "乳房重建",
        "耳鼻喉科",
        "眼科",
        "皮膚科",
        "職業醫學科",
        "神經內科",
        "失智症門診",
        "骨科",
    ],
    6: [
        "脊椎手術中心門診",
        "精神科",
        "身心治療特別門診",
        "婦產科",
        "產檢與高層次超音波",
        "兒童內科",
    ],
}
PAGE_EXTRA_ROW_EDGES = {
    4: [806, 835, 864, 895, 981, 1015, 1050, 1085],
    5: [50, 185, 208, 370, 398, 1246],
    6: [145, 1018, 1060],
}
PAGE_SEGMENT_RANGES = {
    3: [
        (333, 390),
        (390, 669),
        (702, 792),
        (830, 921),
        (957, 1050),
        (1085, 1357),
        (1392, 1440),
    ],
    4: [
        (134, 286),
        (315, 395),
        (395, 516),
        (516, 609),
        (609, 688),
        (688, 778),
        (778, 806),
        (835, 923),
        (948, 1015),
        (1085, 1234),
        (1265, 1373),
        (1399, 1450),
    ],
    5: [
        (50, 153),
        (185, 256),
        (328, 426),
        (548, 620),
        (716, 776),
        (873, 944),
        (1039, 1160),
        (1160, 1246),
        (1335, 1432),
    ],
    6: [
        (70, 255),
        (433, 550),
        (578, 670),
        (868, 989),
        (1018, 1060),
        (1148, 1454),
    ],
}
PAGE_SHIFT_SPANS = {
    2: [
        (314, 465, "上午"),
        (465, 610, "下午"),
        (610, 685, "夜診"),
        (743, 769, "上午"),
        (769, 849, "下午"),
        (849, 873, "夜診"),
        (935, 962, "上午"),
        (962, 1014, "下午"),
        (1014, 1043, "夜診"),
        (1076, 1131, "上午"),
        (1131, 1188, "下午"),
        (1221, 1275, "上午"),
        (1275, 1328, "下午"),
        (1366, 1390, "上午"),
        (1390, 1409, "下午"),
    ],
    3: [
        (333, 390, "上午"),
        (390, 538, "上午"),
        (538, 605, "下午"),
        (605, 669, "夜診"),
        (702, 732, "上午"),
        (732, 762, "下午"),
        (762, 792, "夜診"),
        (830, 860, "上午"),
        (860, 921, "下午"),
        (957, 988, "上午"),
        (988, 1019, "下午"),
        (1019, 1050, "夜診"),
        (1085, 1162, "上午"),
        (1162, 1317, "下午"),
        (1317, 1357, "夜診"),
        (1392, 1440, "上午"),
    ],
    4: [
        (134, 210, "上午"),
        (210, 235, "下午"),
        (235, 286, "夜診"),
        (315, 341, "上午"),
        (341, 395, "下午"),
        (395, 451, "上午"),
        (451, 516, "下午"),
        (516, 542, "上午"),
        (542, 583, "下午"),
        (609, 635, "上午"),
        (635, 662, "下午"),
        (662, 688, "夜診"),
        (688, 749, "上午"),
        (749, 778, "下午"),
        (778, 806, "夜診"),
        (835, 864, "上午"),
        (864, 895, "下午"),
        (895, 923, "夜診"),
        (948, 981, "上午"),
        (981, 1015, "下午"),
        (1085, 1134, "上午"),
        (1134, 1209, "下午"),
        (1209, 1234, "夜診"),
        (1265, 1291, "上午"),
        (1291, 1317, "下午"),
        (1317, 1373, "夜診"),
        (1399, 1426, "上午"),
        (1426, 1450, "下午"),
    ],
    5: [
        (50, 111, "上午"),
        (111, 153, "夜診"),
        (185, 208, "上午"),
        (208, 231, "下午"),
        (231, 256, "夜診"),
        (328, 370, "上午"),
        (370, 398, "下午"),
        (398, 426, "夜診"),
        (548, 596, "上午"),
        (596, 620, "下午"),
        (716, 745, "上午"),
        (745, 776, "下午"),
        (873, 908, "上午"),
        (908, 944, "下午"),
        (1039, 1088, "上午"),
        (1088, 1135, "下午"),
        (1135, 1160, "夜診"),
        (1160, 1216, "上午"),
        (1216, 1246, "夜診"),
        (1335, 1359, "上午"),
        (1359, 1407, "下午"),
        (1407, 1432, "夜診"),
    ],
    6: [
        (70, 145, "上午"),
        (145, 219, "下午"),
        (219, 255, "夜診"),
        (433, 488, "上午"),
        (488, 514, "下午"),
        (514, 550, "夜診"),
        (578, 604, "上午"),
        (604, 629, "下午"),
        (629, 670, "夜診"),
        (868, 892, "上午"),
        (892, 941, "下午"),
        (941, 989, "夜診"),
        (1018, 1060, "上午"),
        (1148, 1254, "上午"),
        (1254, 1334, "下午"),
        (1334, 1454, "夜診"),
    ],
}


@dataclass(frozen=True)
class RowContext:
    top: int
    bottom: int
    department: str
    shift: str


class CgmhImageAdapter(ScheduleAdapter):
    def fetch(self) -> list[RawSchedule]:
        response = httpx.get(self.source.schedule_url, timeout=90, follow_redirects=True)
        response.raise_for_status()
        doc = fitz.open(stream=response.content, filetype="pdf")

        items: list[RawSchedule] = []
        parsed_at = datetime.now(UTC).isoformat()
        for page_index, page in enumerate(doc, start=1):
            if page_index not in PAGE_SEGMENT_DEPARTMENTS:
                continue
            image = render_page(page)
            image._med_link_source_page = page_index
            row_edges = detect_row_edges(image)
            row_edges = sorted(set(row_edges + PAGE_EXTRA_ROW_EDGES.get(page_index, [])))
            if len(row_edges) < 4:
                continue
            items.extend(parse_page_rows(self.source, image, row_edges, page_index, parsed_at))
        return dedupe(items)


def render_page(page: fitz.Page) -> Image.Image:
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    return Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)


def detect_row_edges(image: Image.Image) -> list[int]:
    gray = image.convert("L")
    width, height = gray.size
    left = round(TABLE_X_RANGE[0] * width / 1080)
    right = round(TABLE_X_RANGE[1] * width / 1080)
    threshold = 145
    minimum_dark_pixels = max(90, round((right - left) * 0.58))
    page_hint = getattr(image, "_med_link_source_page", None)
    scan_start = 50 if page_hint in {4, 5, 6} else 170
    ys: list[int] = []
    for y in range(round(scan_start * height / 1289), min(height - 25, round(1210 * height / 1289))):
        dark = sum(1 for x in range(left, right) if gray.getpixel((x, y)) < threshold)
        if dark >= minimum_dark_pixels:
            ys.append(y)

    groups: list[list[int]] = []
    for y in ys:
        if not groups or y - groups[-1][-1] > 2:
            groups.append([y])
        else:
            groups[-1].append(y)

    scale = 1080 / width
    edges = [round((group[0] + group[-1]) / 2 * scale) for group in groups]
    return [edge for edge in edges if scan_start <= edge <= 1450]


def parse_page_rows(
    source,
    image: Image.Image,
    row_edges: list[int],
    page_number: int,
    parsed_at: str,
) -> list[RawSchedule]:
    items: list[RawSchedule] = []
    for segment_index, (segment_top, segment_bottom) in enumerate(table_segments(image, row_edges)):
        current_department = segment_department(image, page_number, segment_index, segment_top, segment_bottom)
        current_shift = ""
        segment_edges = [segment_top]
        segment_edges.extend(edge for edge in row_edges if segment_top < edge < segment_bottom)
        segment_edges.append(segment_bottom)
        for top, bottom in zip(segment_edges, segment_edges[1:]):
            if bottom - top < 16:
                continue
            shift = shift_for_row(page_number, top, bottom) or normalize_shift(ocr_cached(image, (SHIFT_BOX[0], top, SHIFT_BOX[2], bottom), psm="6"))
            if shift:
                current_shift = shift
            if not current_department or not current_shift:
                continue
            if current_department in {"科別", "內科", "外科"}:
                continue

            context = RowContext(top=top, bottom=bottom, department=current_department, shift=current_shift)
            for weekday, weekday_label, left, right in WEEKDAY_COLUMNS:
                raw_text = ocr_cached(image, (left, top, right, bottom), psm="6")
                doctors = extract_doctors(raw_text, allow_fallback=page_number >= 3)
                for doctor_name, note in doctors:
                    items.append(
                        RawSchedule(
                            hospital_id=source.id,
                            hospital_name=source.hospital_name,
                            branch_name=source.branch_name,
                            department=context.department,
                            doctor_name=doctor_name,
                            weekday=weekday,
                            weekday_label=weekday_label,
                            period=context.shift,
                            room=department_room(context.department),
                            source_url=source.schedule_url,
                            source_ref=f"pdf_page:{page_number};row:{top}-{bottom};weekday:{weekday_label}",
                            confidence=0.86,
                            note=note,
                            raw_text=raw_text,
                            source_page=page_number,
                            parsed_at=parsed_at,
                        )
                    )
    return items


def table_segments(image: Image.Image, row_edges: list[int]) -> list[tuple[int, int]]:
    page_hint = getattr(image, "_med_link_source_page", None)
    if page_hint in PAGE_SEGMENT_RANGES:
        return PAGE_SEGMENT_RANGES[page_hint]

    headers: list[tuple[int, int]] = []
    for top, bottom in zip(row_edges, row_edges[1:]):
        if bottom - top < 16:
            continue
        header_text = "".join(
            ocr_cached(image, (left, top, right, bottom), psm="6")
            for _, _, left, right in WEEKDAY_COLUMNS[:3]
        )
        header_text = re.sub(r"\s+", "", header_text)
        if "星期" in header_text or "期一" in header_text:
            headers.append((top, bottom))

    segments: list[tuple[int, int]] = []
    for index, (_, start) in enumerate(headers):
        end = headers[index + 1][0] - 2 if index + 1 < len(headers) else row_edges[-1]
        if end - start >= 35:
            segments.append((start, end))
    return segments


def segment_department(image: Image.Image, page_number: int, segment_index: int, top: int, bottom: int) -> str:
    manual_departments = PAGE_SEGMENT_DEPARTMENTS.get(page_number)
    if manual_departments and segment_index < len(manual_departments):
        return manual_departments[segment_index]
    raw = ocr_cached(image, (DEPARTMENT_BOX[0], top, DEPARTMENT_BOX[2], bottom), psm="6")
    return normalize_department(raw)


def shift_for_row(page_number: int, top: int, bottom: int) -> str:
    mid = round((top + bottom) / 2)
    for span_top, span_bottom, shift in PAGE_SHIFT_SPANS.get(page_number, []):
        if span_top <= mid < span_bottom:
            return shift
    return ""


def ocr_cached(image: Image.Image, box: tuple[int, int, int, int], psm: str) -> str:
    cache_root = Path("data/ocr-cache/cgmh-image")
    cache_root.mkdir(parents=True, exist_ok=True)
    crop = image.crop(tuple(round(value * image.width / 1080) for value in box))
    key = hashlib.sha1()
    key.update(str((box, psm, crop.size)).encode("utf-8"))
    key.update(crop.tobytes())
    path = cache_root / f"{key.hexdigest()}.txt"
    if path.exists():
        return path.read_text(encoding="utf-8", errors="ignore")
    text = ocr_base_crop(image, box, psm=psm)
    path.write_text(text, encoding="utf-8")
    return text


def normalize_department(text: str) -> str:
    compact = re.sub(r"\s+", "", text)
    compact = re.sub(r"[^\u4e00-\u9fffA-Za-z0-9]", "", compact)
    for department in KNOWN_DEPARTMENTS:
        if department in compact:
            return department
    compact = compact.replace("三樓胸腔內科診區", "")
    compact = compact.replace("地下樓內科診區", "")
    compact = compact.replace("科別", "")
    if len(compact) > 18:
        compact = compact[:18]
    return compact


def normalize_shift(text: str) -> str:
    compact = re.sub(r"\s+", "", text)
    if "上午" in compact:
        return "上午"
    if "下午" in compact:
        return "下午"
    if "夜" in compact or "晚" in compact:
        return "夜診"
    return ""


def department_room(department: str) -> str:
    if "胸腔內科" in department:
        return "三樓胸腔內科診區"
    if any(token in department for token in ["一般內科", "胃腸肝膽科", "血液腫瘤科", "腎臟科", "內分泌"]):
        return "地下樓內科診區"
    if "泌尿科" in department:
        return "二樓泌尿科診區"
    if "神經外科" in department:
        return "地下一樓外科診區 B23/B27診間"
    if "心臟血管外科" in department:
        return "地下一樓外科診區 B25診間"
    if "胸腔外科" in department:
        return "地下一樓外科診區 B26診間"
    if "整形外科" in department:
        return "地下一樓外科診區 B29診間"
    if "大腸直腸肛門外科" in department:
        return "地下一樓外科診區 B28診間"
    if "外傷科" in department:
        return "五樓501/502診間"
    if "靜脈曲張門診" in department:
        return "地下一樓外科診區 B25診間"
    if any(token in department for token in ["一般外科", "乳房外科"]):
        return "五樓501/502診間"
    if "甲狀腺外科" in department:
        return "五樓501診間"
    if "代謝減重手術門診" in department:
        return "五樓501/502診間"
    if "乳房重建" in department:
        return "地下一樓外科診區 B29診間"
    if "耳鼻喉科" in department:
        return "地下一樓耳鼻喉科 B01/B02診間"
    if "眼科" in department:
        return "地下樓 B03/B05診間"
    if "皮膚科" in department:
        return "地下一樓 B33診間"
    if "職業醫學科" in department:
        return "三樓305/307診間"
    if any(token in department for token in ["神經內科", "失智症門診"]):
        return "一樓103/105/106診間"
    if "骨科" in department:
        return "一樓101/102診間"
    if "脊椎手術中心門診" in department:
        return "依原表診區"
    if any(token in department for token in ["精神科", "身心治療特別門診"]):
        return "地下樓 B36診間"
    if "婦產科" in department:
        return "三樓310/311診間"
    if "產檢與高層次超音波" in department:
        return "三樓311診間"
    if "兒童內科" in department:
        return "三樓兒科診區"
    return "依現場診區"


def extract_doctors(text: str, allow_fallback: bool = True) -> list[tuple[str, str]]:
    raw = text.replace("\n", " ")
    compact = re.sub(r"\s+", "", raw)
    note = "；".join(dict.fromkeys(match.strip() for match in NOTE_PATTERN.findall(raw) if match.strip()))
    doctors: list[tuple[str, str]] = []
    seen: set[str] = set()
    for match in DOCTOR_PATTERN.finditer(compact):
        name = normalize_doctor_name(match.group(1))
        if not name or name in seen:
            continue
        seen.add(name)
        doctors.append((name, note))
    if doctors or not allow_fallback:
        return doctors

    fallback_text = re.sub(r"[A-Za-z0-9#＃◎▲△※|_=\-—﹍ˍˉ﹁﹂、，。﹚﹛﹜（）()；:：]+", " ", raw)
    for match in re.finditer(r"([\u4e00-\u9fff](?:\s+[\u4e00-\u9fff]){1,3})", fallback_text):
        name = normalize_doctor_name(match.group(1))
        if not name or name in seen:
            continue
        seen.add(name)
        doctors.append((name, note))
    return doctors


def normalize_doctor_name(name: str) -> str:
    clean = re.sub(r"[^\u4e00-\u9fff]", "", name)
    clean = DOCTOR_CORRECTIONS.get(clean, clean)
    if not clean:
        return ""
    if len(clean) < 2 or len(clean) > 4:
        return ""
    if len(clean) == 4 and clean[:2] == "星期":
        return ""
    if clean in IGNORED_DOCTOR_NAMES:
        return ""
    if any(
        token in clean
        for token in [
            "診區",
            "診間",
            "上午",
            "下午",
            "夜間",
            "科別",
            "時段",
            "地下",
            "三樓",
            "一樓",
            "二樓",
            "星期",
            "日期",
            "期二",
            "期三",
            "期四",
            "期五",
            "詮",
            "誥",
            "誌",
            "診",
            "泌",
            "唱",
            "檳",
            "護",
            "向",
            "欄",
            "橫",
            "圖",
            "啶",
            "岡",
            "閻",
            "琢",
            "壅",
            "泉",
            "汙",
        ]
    ):
        return ""
    return clean


def dedupe(items: list[RawSchedule]) -> list[RawSchedule]:
    seen: set[tuple[str, str, str, int, str, str]] = set()
    unique: list[RawSchedule] = []
    for item in items:
        key = (item.hospital_id, item.department, item.doctor_name, item.weekday, item.period, item.raw_text)
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique
