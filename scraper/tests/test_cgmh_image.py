from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.cgmh_image import extract_doctors, normalize_department, normalize_shift, shift_for_row


class CgmhImageParserTest(unittest.TestCase):
    def test_extract_doctors_from_scanned_cell_text(self) -> None:
        self.assertEqual(extract_doctors("16560 黃文琦 #14620 鄭本忠"), [("黃文琦", ""), ("鄭本忠", "")])
        self.assertEqual(extract_doctors("26516 蔡 褲 晏 1407 詮 周"), [("蔡青晏", "")])

    def test_extract_doctors_keeps_note(self) -> None:
        self.assertEqual(extract_doctors("19043 吳柏融（地下樓B12診間）"), [("吳柏融", "地下樓B12診間")])

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


if __name__ == "__main__":
    unittest.main()
