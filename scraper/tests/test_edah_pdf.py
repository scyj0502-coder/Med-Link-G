from __future__ import annotations

import unittest

from adapters.edah_pdf import (
    canonical_department,
    code_matches_period,
    department_room,
    detect_branch_ids,
    extract_doctor_candidates,
    extract_note,
    nearby_digit_codes,
    period_from_code,
    should_parse_page,
)


class EdahPdfParserTest(unittest.TestCase):
    def test_dachang_uses_department_floor_not_doctor_code_as_room(self) -> None:
        self.assertEqual(department_room("edah-dachang", "心臟內科", "心臟內科"), "二樓")
        self.assertEqual(department_room("edah-dachang", "胃腸肝膽科", "胃腸肝膽科"), "三樓")

    def test_department_room_falls_back_to_floor_text(self) -> None:
        self.assertEqual(department_room("edah-main", "未知科別", "門診位置 B1 內科診區"), "B1 內科診區")
        self.assertEqual(department_room("edah-main", "未知科別", "門診位置 三樓"), "三樓")

    def test_doctor_code_period_prefix_maps_to_shift(self) -> None:
        self.assertEqual(period_from_code("11333"), "上午")
        self.assertEqual(period_from_code("22726"), "下午")
        self.assertEqual(period_from_code("32726"), "夜診")
        self.assertTrue(code_matches_period("11333", "上午"))
        self.assertFalse(code_matches_period("32726", "上午"))

    def test_extract_doctor_candidates_keeps_doctor_code_but_not_room(self) -> None:
        candidates = extract_doctor_candidates("宣錦峰11333\n蕭世宏32726")

        self.assertEqual([(item.ocr_name, item.schedule_code, item.doctor_code) for item in candidates], [("宣錦峰", "11333", "1333"), ("蕭世宏", "32726", "2726")])

    def test_department_alias_repairs_common_ocr_text(self) -> None:
        self.assertEqual(canonical_department("胃腸肝膊科"), "胃腸肝膽科")
        self.assertEqual(canonical_department("呼吸胸腔內科"), "呼吸胸腔科")
        self.assertEqual(canonical_department("心臟血管內科"), "心臟內科")

    def test_detect_branch_and_skip_penghu_pages(self) -> None:
        schedule_text = "門診時間表 星期一 星期二 星期三"

        self.assertTrue(should_parse_page("edah-main", [], schedule_text))
        self.assertFalse(should_parse_page("edah-main", [], f"{schedule_text} 澎湖 駐診"))
        self.assertEqual(detect_branch_ids("義大大昌醫院 門診時間表"), ["edah-dachang"])
        self.assertTrue(should_parse_page("edah-dachang", ["edah-dachang"], schedule_text))
        self.assertFalse(should_parse_page("edah-dachang", ["edah-main"], schedule_text))

    def test_notes_keep_stop_limited_and_dates(self) -> None:
        self.assertEqual(extract_note("5/12、26 停診 初診限掛"), "停診；限掛；初診；5/12、26")

    def test_nearby_digit_codes_cover_common_ocr_confusions(self) -> None:
        self.assertIn("32725", nearby_digit_codes("32726"))
        self.assertIn("32776", nearby_digit_codes("32726"))


if __name__ == "__main__":
    unittest.main()
