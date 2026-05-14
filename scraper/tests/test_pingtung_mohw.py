from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.pingtung_mohw import (
    doctor_name_candidates,
    extract_doctors,
    normalize_room,
    room_override_for_row,
    shift_override_for_row,
    uncorrected_doctor_candidates,
)


class PingtungMohwParserTest(unittest.TestCase):
    def test_extract_doctors_ignores_doctor_codes_and_corrects_ocr_names(self) -> None:
        doctors = extract_doctors("| 蔡 文 據 714 | 楊 博 翥 7186", "一般消化外科")

        self.assertEqual(doctors, [("蔡文豪", ""), ("楊博翔", "")])

    def test_extract_doctors_keeps_parenthesis_note(self) -> None:
        doctors = extract_doctors("李 智 雄 0264 (10:30 點 前 報 到) 林 詩 晴 7135", "心臟科")

        self.assertEqual(doctors, [("李智雄", "10:30 點 前 報 到"), ("林詩晴", "10:30 點 前 報 到")])

    def test_extract_doctors_drops_unknown_ocr_garbage(self) -> None:
        doctors = extract_doctors("門誒 斗一 撥打 7152", "一般科")

        self.assertEqual(doctors, [])

    def test_normalize_room_uses_left_room_column_variants(self) -> None:
        self.assertEqual(normalize_room("二 詑 | 25"), "二診25")
        self.assertEqual(normalize_room("ˍˍ﹡爹 | 12"), "診12")
        self.assertEqual(normalize_room("1-2 | 36"), "診36")

    def test_normalize_room_keeps_multiple_left_room_values(self) -> None:
        self.assertEqual(normalize_room("一 診 26 二 診 25"), "一診26 / 二診25")

    def test_room_override_for_fixed_pingtung_rows(self) -> None:
        self.assertEqual(room_override_for_row(2, 196, 260), "一診7")
        self.assertEqual(room_override_for_row(5, 1040, 1100), "一診2")
        self.assertEqual(room_override_for_row(4, 562, 684), "一診19 / 二診18")
        self.assertEqual(shift_override_for_row(4, 562, 684), "上午")

    def test_uncorrected_doctor_candidates_reports_dropped_names(self) -> None:
        self.assertEqual(doctor_name_candidates("林 鏗 正 ma"), ["林鏗正"])
        self.assertEqual(uncorrected_doctor_candidates("未知名 9999", "一般科"), ["未知名"])

    def test_second_round_high_confidence_ocr_corrections(self) -> None:
        self.assertEqual(extract_doctors("劉 家 駟 0904", "泌尿科"), [("劉家駒", "")])
        self.assertEqual(extract_doctors("陳 姝 蕉 /037", "骨科"), [("陳姝蓉", "")])
        self.assertEqual(extract_doctors("蹄 筑 元 7206", "兒科"), [("蕭筑元", "")])
        self.assertEqual(extract_doctors("林 治 邦 7046 盧 道 覽 0357", "整形外科"), [("林治邦", ""), ("盧道覺", "")])


if __name__ == "__main__":
    unittest.main()
