from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.base import RawSchedule
from adapters.cgmh_image import (
    dedupe,
    extract_doctor_entries,
    extract_doctors,
    extract_room,
    normalize_department,
    normalize_shift,
    shift_for_row,
)


class CgmhImageParserTest(unittest.TestCase):
    def test_extract_doctors_from_scanned_cell_text(self) -> None:
        self.assertEqual(extract_doctors("16560 黃文琦 #14620 鄭本忠"), [("黃文琦", ""), ("鄭本忠", "")])
        self.assertEqual(extract_doctors("26516 蔡 褲 晏 1407 詮 周"), [("蔡青晏", "")])
        self.assertEqual(extract_doctors("13 李 建 和 | 18K"), [("李建和", "")])

    def test_extract_doctors_keeps_note(self) -> None:
        self.assertEqual(extract_doctors("7152 謝易倫（肝膽胰腸胃內科）"), [("謝易倫", "肝膽胰腸胃內科")])

    def test_extract_room_from_datong_doctor_subline(self) -> None:
        self.assertEqual(extract_room("16560 黃文琦 (地下1樓)B07診間"), "地下1樓B07診間")
        self.assertEqual(extract_room("14717 曾嘉成（三樓305診間）"), "三樓305診間")

    def test_extract_doctor_entries_keep_doctor_specific_room(self) -> None:
        entries = extract_doctor_entries("16560 黃文琦 (地下1樓)B07診間 14620 鄭本忠 (地下1樓)B12診間")
        self.assertEqual(
            [(entry.doctor_name, entry.room, entry.note) for entry in entries],
            [("黃文琦", "地下1樓B07診間", ""), ("鄭本忠", "地下1樓B12診間", "")],
        )

    def test_extract_doctors_corrects_datong_ocr_variants(self) -> None:
        self.assertEqual(extract_doctors("29408 戴 十 翔"), [("戴千翔", "")])
        self.assertEqual(extract_doctors("14782 當 柏 霖"), [("曾柏霖", "")])
        self.assertEqual(extract_doctors("24973 虧 勝 男"), [("盧勝男", "")])
        self.assertEqual(extract_doctors("16284 邱 鼎 脣"), [("邱鼎育", "")])
        self.assertEqual(extract_doctors("34007 陳 英 州"), [("陳英州", "")])

    def test_normalize_shift(self) -> None:
        self.assertEqual(normalize_shift("上午"), "上午")
        self.assertEqual(normalize_shift("下午"), "下午")
        self.assertEqual(normalize_shift("夜間"), "夜診")

    def test_normalize_department_removes_location_hint(self) -> None:
        self.assertEqual(normalize_department("一般內科\n地下樓內科診區"), "一般內科")

    def test_datong_page_two_shift_template(self) -> None:
        self.assertEqual(shift_for_row(2, 314, 353), "上午")
        self.assertEqual(shift_for_row(2, 465, 501), "下午")
        self.assertEqual(shift_for_row(2, 610, 645), "夜診")

    def test_datong_page_four_shift_template(self) -> None:
        self.assertEqual(shift_for_row(4, 134, 159), "上午")
        self.assertEqual(shift_for_row(4, 210, 235), "下午")
        self.assertEqual(shift_for_row(4, 235, 286), "夜診")
        self.assertEqual(shift_for_row(4, 835, 864), "上午")
        self.assertEqual(shift_for_row(4, 981, 1015), "下午")
        self.assertEqual(shift_for_row(4, 1426, 1450), "下午")

    def test_datong_page_five_shift_template(self) -> None:
        self.assertEqual(shift_for_row(5, 328, 370), "上午")
        self.assertEqual(shift_for_row(5, 370, 398), "下午")
        self.assertEqual(shift_for_row(5, 398, 426), "夜診")
        self.assertEqual(shift_for_row(5, 596, 620), "下午")
        self.assertEqual(shift_for_row(5, 1039, 1064), "上午")
        self.assertEqual(shift_for_row(5, 1135, 1160), "夜診")
        self.assertEqual(shift_for_row(5, 1160, 1216), "上午")

    def test_datong_page_six_shift_template(self) -> None:
        self.assertEqual(shift_for_row(6, 70, 105), "上午")
        self.assertEqual(shift_for_row(6, 145, 184), "下午")
        self.assertEqual(shift_for_row(6, 941, 989), "夜診")
        self.assertEqual(shift_for_row(6, 1018, 1060), "上午")
        self.assertEqual(shift_for_row(6, 1334, 1414), "夜診")

    def test_datong_page_seven_to_nine_shift_templates(self) -> None:
        self.assertEqual(shift_for_row(7, 70, 126), "上午")
        self.assertEqual(shift_for_row(7, 891, 966), "下午")
        self.assertEqual(shift_for_row(8, 221, 370), "上午")
        self.assertEqual(shift_for_row(8, 489, 519), "夜診")
        self.assertEqual(shift_for_row(9, 138, 164), "上午")
        self.assertEqual(shift_for_row(9, 190, 318), "上午")

    def test_dedupe_uses_publish_key_fields(self) -> None:
        base = RawSchedule(
            hospital_id="cgmh-datong",
            hospital_name="高雄市立大同醫院",
            branch_name="總院",
            department="一般外科",
            doctor_name="洪國頡",
            weekday=2,
            weekday_label="星期二",
            period="下午",
            room="五樓501/502診間",
            source_url="https://example.test/schedule.pdf",
            source_ref="pdf_page:4;row:1134-1184;weekday:星期二",
            confidence=0.86,
            raw_text="14723 洪國頡",
        )
        duplicate = RawSchedule(**{**base.__dict__, "raw_text": "94723 洪 國 禱"})
        self.assertEqual(len(dedupe([base, duplicate])), 1)


if __name__ == "__main__":
    unittest.main()
