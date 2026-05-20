from __future__ import annotations

import httpx
import unittest
from unittest.mock import patch
from PIL import Image, ImageDraw

from adapters.base import HospitalSource
from adapters.antai_image import (
    Box,
    RowContext,
    SourceImage,
    TableGrid,
    build_schedules_from_cells,
    data_row_ranges,
    detect_table_grid,
    discover_latest_images,
    extract_cell_doctors,
    left_context_boxes,
    merge_positions,
    normalize_cell_text,
    parse_image_table,
    read_row_contexts,
    row_context_from_text,
    schedule_column_edges,
    schedule_cell_boxes,
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

    def test_schedule_column_edges_ignore_left_label_strokes(self) -> None:
        grid = TableGrid(
            x_lines=[54, 90, 204, 228, 236, 258, 310, 400, 489, 578, 669, 759, 848, 938, 1028, 1118, 1207, 1297, 1386, 1477, 1566, 1656, 1746],
            y_lines=[],
        )

        self.assertEqual(schedule_column_edges(grid)[0], 310)
        self.assertEqual(schedule_columns(grid)[0].left, 310)

    def test_data_row_ranges_skip_header_rows(self) -> None:
        grid = TableGrid(x_lines=[], y_lines=[225, 244, 260, 276, 317, 374, 410])

        self.assertEqual(data_row_ranges(grid), [(276, 317), (317, 374), (374, 410)])

    def test_left_context_boxes_use_department_and_location_columns(self) -> None:
        grid = TableGrid(
            x_lines=[54, 90, 204, 310, 400, 489, 578, 669, 759, 848, 938, 1028, 1118, 1207, 1297, 1386, 1477, 1566, 1656, 1746],
            y_lines=[],
        )

        department_box, location_box = left_context_boxes(grid, (276, 317))

        self.assertEqual(department_box, Box(left=90, top=276, right=204, bottom=317))
        self.assertEqual(location_box, Box(left=204, top=276, right=310, bottom=317))

    def test_row_context_carries_previous_department_and_location(self) -> None:
        previous = RowContext(department="一般內科", location="復建大樓2樓", top=276, bottom=317)

        context = row_context_from_text("", "", (317, 374), previous)

        self.assertEqual(context.department, "一般內科")
        self.assertEqual(context.location, "復建大樓2樓")
        self.assertEqual((context.top, context.bottom), (317, 374))

    def test_schedule_cell_boxes_attach_column_and_row_context(self) -> None:
        grid = TableGrid(
            x_lines=[54, 90, 204, 310, 400, 489, 578, 669, 759, 848, 938, 1028, 1118, 1207, 1297, 1386, 1477, 1566, 1656, 1746],
            y_lines=[],
        )
        row_context = RowContext(department="一般內科", location="復建大樓2樓", top=276, bottom=317)

        cells = schedule_cell_boxes(grid, [row_context])

        self.assertEqual(len(cells), 16)
        self.assertEqual(cells[0].box, Box(left=310, top=276, right=400, bottom=317))
        self.assertEqual(cells[0].column.weekday_label, "星期一")
        self.assertEqual(cells[0].column.period, "上午")
        self.assertEqual(cells[0].row_context.department, "一般內科")

    def test_read_row_contexts_uses_left_boxes_and_carries_context(self) -> None:
        image = Image.new("RGB", (1800, 500), "white")
        grid = TableGrid(
            x_lines=[54, 90, 204, 310, 400, 489, 578, 669, 759, 848, 938, 1028, 1118, 1207, 1297, 1386, 1477, 1566, 1656, 1746],
            y_lines=[225, 244, 260, 276, 317, 374],
        )
        ocr_outputs = iter(["一般內科", "復建大樓 2樓", "", ""])

        contexts = read_row_contexts(image, grid, lambda crop: next(ocr_outputs))

        self.assertEqual([(item.department, item.location) for item in contexts], [("一般內科", "復建大樓2樓"), ("一般內科", "復建大樓2樓")])

    def test_normalize_cell_text_removes_ocr_spacing(self) -> None:
        self.assertEqual(normalize_cell_text("王 程 慶\nC21 誌\n"), "王程慶C21誌")

    def test_extract_cell_doctors_repairs_room_suffix_ocr_variants(self) -> None:
        doctors = extract_cell_doctors("王 程 慶\nC21 誌\n洪 仲 傑\nC22 認")

        self.assertEqual(
            [(item.doctor_name, item.room) for item in doctors],
            [("王程慶", "C21診"), ("洪仲傑", "C22診")],
        )

    def test_extract_cell_doctors_trims_extra_ocr_digit_after_room(self) -> None:
        doctors = extract_cell_doctors("謝 佳 妏\nC212 ﹍")

        self.assertEqual([(item.doctor_name, item.room) for item in doctors], [("謝佳妏", "C21診")])

    def test_extract_cell_doctors_keeps_parenthesis_note(self) -> None:
        doctors = extract_cell_doctors("林清菁 C36診（清福刀特別門診）")

        self.assertEqual([(item.doctor_name, item.room, item.note) for item in doctors], [("林清菁", "C36診", "清福刀特別門診")])

    def test_build_schedules_from_cells_uses_structured_cell_context(self) -> None:
        source = HospitalSource(
            id="antai",
            enabled=False,
            adapter="antai_image",
            region="屏東",
            hospital_name="安泰醫院",
            branch_name="總院",
            departments=[],
            schedule_url="https://www.tsmh.org.tw/sites/web_dg/show_web_page.php?edsno=1003",
        )
        image_ref = SourceImage(
            url="https://example.test/202605-1.jpg",
            source_month="2026-05",
            page_number=1,
            file_hash="abc123",
        )
        column = schedule_columns(
            TableGrid(
                x_lines=[54, 90, 204, 310, 400, 489, 578, 669, 759, 848, 938, 1028, 1118, 1207, 1297, 1386, 1477, 1566, 1656, 1746],
                y_lines=[],
            )
        )[0]
        cell = schedule_cell_boxes(
            TableGrid(
                x_lines=[54, 90, 204, 310, 400, 489, 578, 669, 759, 848, 938, 1028, 1118, 1207, 1297, 1386, 1477, 1566, 1656, 1746],
                y_lines=[],
            ),
            [RowContext(department="一般內科", location="復建大樓2樓", top=276, bottom=317)],
        )[0]
        self.assertEqual(cell.column, column)

        schedules = build_schedules_from_cells(source, image_ref, "2026-05-20T00:00:00+00:00", [(cell, "王 程 慶\nC21 誌\n")])

        self.assertEqual(len(schedules), 1)
        self.assertEqual(schedules[0].department, "一般內科")
        self.assertEqual(schedules[0].doctor_name, "王程慶")
        self.assertEqual(schedules[0].weekday_label, "星期一")
        self.assertEqual(schedules[0].period, "上午")
        self.assertEqual(schedules[0].room, "C21診")
        self.assertIn("復建大樓2樓", schedules[0].note)
        self.assertEqual(schedules[0].source_type, "image")

    def test_parse_image_table_reads_context_then_schedule_cells(self) -> None:
        source = HospitalSource(
            id="antai",
            enabled=False,
            adapter="antai_image",
            region="屏東",
            hospital_name="安泰醫院",
            branch_name="總院",
            departments=[],
            schedule_url="https://www.tsmh.org.tw/sites/web_dg/show_web_page.php?edsno=1003",
        )
        image_ref = SourceImage(url="https://example.test/202605-1.jpg", source_month="2026-05", page_number=1)
        grid = TableGrid(
            x_lines=[54, 90, 204, 310, 400, 489, 578, 669, 759, 848, 938, 1028, 1118, 1207, 1297, 1386, 1477, 1566, 1656, 1746],
            y_lines=[225, 244, 260, 276, 317],
        )
        ocr_values = ["一般內科", "復建大樓 2樓", "王 程 彥\nC21 誌"] + [""] * 15

        with patch("adapters.antai_image.detect_table_grid", return_value=grid):
            schedules = parse_image_table(
                source=source,
                image=Image.new("RGB", (1800, 500), "white"),
                image_ref=image_ref,
                fetched_at="2026-05-20T00:00:00+00:00",
                ocr=lambda crop: ocr_values.pop(0),
            )

        self.assertEqual(len(schedules), 1)
        self.assertEqual(schedules[0].doctor_name, "王程彥")
        self.assertEqual(schedules[0].department, "一般內科")
        self.assertEqual(schedules[0].room, "C21診")


if __name__ == "__main__":
    unittest.main()
