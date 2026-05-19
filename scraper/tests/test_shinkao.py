from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.shinkao import extract_doctors, parse_schedule_row


class ShinkaoParserTest(unittest.TestCase):
    def test_parse_full_schedule_row(self) -> None:
        parsed = parse_schedule_row(
            ["心臟內科", "上午", "王小明", "", "陳小華", "", "", ""],
            "",
        )

        self.assertEqual(
            parsed,
            (
                "心臟內科",
                "上午",
                [(1, "星期一", "王小明"), (3, "星期三", "陳小華")],
            ),
        )

    def test_parse_continued_schedule_row_uses_current_department(self) -> None:
        parsed = parse_schedule_row(
            ["下午", "王小明", "", "", "", "", ""],
            "心臟內科",
        )

        self.assertEqual(parsed, ("心臟內科", "下午", [(1, "星期一", "王小明")]))

    def test_parse_night_period_alias(self) -> None:
        parsed = parse_schedule_row(
            ["心臟內科", "晚上", "王小明", "", "", "", "", ""],
            "",
        )

        self.assertEqual(parsed, ("心臟內科", "夜診", [(1, "星期一", "王小明")]))

    def test_extract_doctors_keeps_cell_notes(self) -> None:
        self.assertEqual(
            extract_doctors("王小明-限掛、陳小華：約診"),
            [("王小明", "限掛"), ("陳小華", "約診")],
        )


if __name__ == "__main__":
    unittest.main()
