from __future__ import annotations

import httpx
import unittest
from unittest.mock import patch
from PIL import Image, ImageDraw

from adapters.antai_image import detect_table_grid, discover_latest_images, merge_positions


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


if __name__ == "__main__":
    unittest.main()
