from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from adapters.base import HospitalSource
from adapters.kmugh import KmughAdapter


class KmughAdapterTest(unittest.TestCase):
    def test_fetch_filters_to_configured_departments(self) -> None:
        source = HospitalSource(
            id="kmugh",
            enabled=True,
            adapter="kmugh",
            region="高雄",
            hospital_name="高雄醫學大學附設醫院",
            branch_name="岡山醫院",
            departments=["心臟血管內科", "肝膽內科"],
            schedule_url="https://www.kmugh.org.tw/web/kmugh/MedicalService/OPDSchedule",
        )
        fixture = {
            "sessions": [
                {
                    "id": "keep-heart",
                    "category": "心臟血管內科",
                    "doctorName": "郭炫孚",
                    "weekdays": [2],
                    "sourceWeekdayLabel": "星期二",
                    "period": "上午",
                    "room": "診間 0107",
                    "sourcePage": 8,
                },
                {
                    "id": "keep-liver",
                    "category": "肝膽內科",
                    "doctorName": "吳韋聰",
                    "weekdays": [4],
                    "sourceWeekdayLabel": "星期四",
                    "period": "下午",
                    "room": "診間 0201",
                    "sourcePage": 8,
                },
                {
                    "id": "drop-other",
                    "category": "胸腔內科",
                    "doctorName": "測試醫師",
                    "weekdays": [5],
                    "sourceWeekdayLabel": "星期五",
                    "period": "上午",
                    "room": "診間 0301",
                    "sourcePage": 9,
                },
            ]
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            fixture_path = Path(tmpdir) / "okayama.json"
            fixture_path.write_text(json.dumps(fixture, ensure_ascii=False), encoding="utf-8")
            schedules = KmughAdapter(source, fixture_path=fixture_path).fetch()

        self.assertEqual([item.doctor_name for item in schedules], ["郭炫孚", "吳韋聰"])
        self.assertEqual([item.department for item in schedules], ["心臟血管內科", "肝膽內科"])
        self.assertEqual(schedules[0].hospital_name, "高雄醫學大學附設醫院")
        self.assertEqual(schedules[0].branch_name, "岡山醫院")
        self.assertEqual(schedules[0].weekday, 2)
        self.assertEqual(schedules[0].source_ref, "page:8;id:keep-heart")

    def test_fetch_uses_department_when_category_is_missing(self) -> None:
        source = HospitalSource(
            id="kmugh",
            enabled=True,
            adapter="kmugh",
            region="高雄",
            hospital_name="高雄醫學大學附設醫院",
            branch_name="岡山醫院",
            departments=["肝膽內科"],
            schedule_url="https://www.kmugh.org.tw/web/kmugh/MedicalService/OPDSchedule",
        )
        fixture = {
            "sessions": [
                {
                    "id": "fallback-department",
                    "department": "肝膽內科",
                    "doctorName": "吳韋聰",
                    "weekdays": [4],
                    "sourceWeekdayLabel": "星期四",
                    "period": "下午",
                    "room": "診間 0201",
                }
            ]
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            fixture_path = Path(tmpdir) / "okayama.json"
            fixture_path.write_text(json.dumps(fixture, ensure_ascii=False), encoding="utf-8")
            schedules = KmughAdapter(source, fixture_path=fixture_path).fetch()

        self.assertEqual(len(schedules), 1)
        self.assertEqual(schedules[0].department, "肝膽內科")


if __name__ == "__main__":
    unittest.main()
