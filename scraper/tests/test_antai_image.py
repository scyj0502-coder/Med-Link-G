from __future__ import annotations

import httpx
import unittest
from unittest.mock import patch
from PIL import Image, ImageDraw

from adapters.antai_image import (
    TableGrid,
    data_row_ranges,
    detect_table_grid,
    discover_latest_images,
    extract_cell_doctors,
    merge_positions,
    normalize_cell_text,
    schedule_columns,
)


class AntaiImageParserTest(unittest.TestCase):
    def test_discover_latest_images_from_html(self) -> None:
        html = """
        <html>
          <body>
            <img src="/sites/images-1003/202604-1.jpg">
            <a href="/sites/images-1003/202605-2.jpg">page 2</a>
            <img src="/sites/images-1003/202605-1.jpg">
          </body>
        </html>
        """

        def fake_get(url: str, **kwargs):
            return httpx.Response(200, text=html, request=httpx.Request("GET", url))

        with patch("httpx.get", fake_get):
            images = discover_latest_images("https://www.tsmh.org.tw/sites/web_dg/show_web_page.php?edsno=1003")

        self.assertEqual([item.page_number for item in images], [1, 2])
        self.assertTrue(all(item.source_month == "2026-05" for item in images))
        self.assertEqual(images[0].url, "http://www.tsmh.org.tw/sites/images-1003/202605-1.jpg")

    def test_merge_positions_collapses_line_width(self) -> None:
        self.assertEqual(merge_positions([10, 11, 12, 30, 31, 70]), [11, 30, 70])

    def test_detect_table_grid_from_image_lines(self) -> None:
        image = Image.new("RGB", (220, 180), "white")
        draw = ImageDraw.Draw(image)
        for x in [20, 80, 140, 200]:
            draw.line((x, 10, x, 170), fill="black", width=2)
        for y in [20, 60, 100, 140]:
            draw.line((10, y, 210, y), fill="black", width=2)

        grid = detect_table_grid(image)

        self.assertEqual(grid.x_lines, [20, 80, 140, 200])
        self.assertEqual(grid.y_lines, [20, 60, 100, 140])

    def test_schedule_columns_map_antai_weekday_periods(self) -> None:
        grid = TableGrid(
            x_lines=[54, 90, 204, 310, 400, 489, 578, 669, 759, 848, 938, 1028, 1118, 1207, 1297, 1386, 1477, 1566, 1656, 1746],
            y_lines=[],
        )

        columns = schedule_columns(grid)

        self.assertEqual(len(columns), 16)
        self.assertEqual((columns[0].weekday_label, columns[0].period, columns[0].left, columns[0].right), ("星期一", "上午", 310, 400))
        self.assertEqual((columns[2].weekday_label, columns[2].period), ("星期一", "夜診"))
        self.assertEqual((columns[15].weekday_label, columns[15].period, columns[15].left, columns[15].right), ("星期六", "上午", 1656, 1746))

    def test_data_row_ranges_skip_header_rows(self) -> None:
        grid = TableGrid(x_lines=[], y_lines=[225, 244, 260, 276, 317, 374, 410])

        self.assertEqual(data_row_ranges(grid), [(317, 374), (374, 410)])

    def test_normalize_cell_text_removes_ocr_spacing(self) -> None:
        self.assertEqual(normalize_cell_text("王 程 慶\nC21 誌\n"), "王程慶C21誌")

    def test_extract_cell_doctors_repairs_room_suffix_ocr_variants(self) -> None:
        doctors = extract_cell_doctors("王 程 慶\nC21 誌\n洪 仲 傑\nC22 認")

        self.assertEqual(
            [(item.doctor_name, item.room) for item in doctors],
            [("王程慶", "C21診"), ("洪仲傑", "C22診")],
        )

    def test_extract_cell_doctors_keeps_parenthesis_note(self) -> None:
        doctors = extract_cell_doctors("林清菁 C36診（清福刀特別門診）")

        self.assertEqual([(item.doctor_name, item.room, item.note) for item in doctors], [("林清菁", "C36診", "清福刀特別門診")])


if __name__ == "__main__":
    unittest.main()
