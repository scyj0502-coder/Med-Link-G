from __future__ import annotations

import httpx
import unittest
from unittest.mock import patch

from adapters.antai_image import discover_latest_images


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


if __name__ == "__main__":
    unittest.main()
