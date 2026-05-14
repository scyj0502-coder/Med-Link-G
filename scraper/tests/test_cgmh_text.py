from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.cgmh_text import TextWord, build_schedule_texts, column_for_x, extract_doctors, normalize_room


class CgmhTextParserTest(unittest.TestCase):
    def test_extract_doctors_ignores_codes_and_keeps_names(self) -> None:
        self.assertEqual(
            extract_doctors("11684駱聰成＃19075黃琨祥"),
            [("駱聰成", ""), ("黃琨祥", "")],
        )
        self.assertEqual(
            extract_doctors("2J086 趙映程"),
            [("趙映程", "")],
        )

    def test_extract_doctors_keeps_parenthesis_note(self) -> None:
        self.assertEqual(
            extract_doctors("11684 駱聰成(老年醫學科門診)"),
            [("駱聰成", "老年醫學科門診")],
        )

    def test_column_for_x_maps_weekday_and_period(self) -> None:
        self.assertEqual(column_for_x(180), (1, "上午"))
        self.assertEqual(column_for_x(230), (1, "下午"))
        self.assertEqual(column_for_x(680), (6, "上午"))

    def test_normalize_room_keeps_floor_text(self) -> None:
        self.assertEqual(normalize_room("醫學大樓"), "醫學大樓")
        self.assertEqual(normalize_room("二樓家醫"), "二樓家醫")
        self.assertEqual(normalize_room("樓"), "")
        self.assertEqual(normalize_room("科別"), "")

    def test_build_schedule_texts_joins_code_and_name_in_same_line(self) -> None:
        words = [
            TextWord(160, 100, 178, 108, "16367", 1, 1, 1),
            TextWord(180, 100, 205, 108, "邱千華", 1, 1, 2),
        ]

        self.assertEqual(build_schedule_texts(words)[0].text, "16367邱千華")


if __name__ == "__main__":
    unittest.main()
