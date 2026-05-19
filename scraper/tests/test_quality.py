from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.base import RawSchedule
from core.quality import partition_publishable, reject_reason


class QualityRulesTest(unittest.TestCase):
    def test_reject_low_confidence(self) -> None:
        self.assertEqual(reject_reason(schedule(confidence=0.5)), "low_confidence")

    def test_reject_missing_required_fields(self) -> None:
        self.assertEqual(reject_reason(schedule(doctor_name="")), "missing_doctor_name")
        self.assertEqual(reject_reason(schedule(department="")), "missing_department")

    def test_reject_invalid_weekday_and_period(self) -> None:
        self.assertEqual(reject_reason(schedule(weekday=7)), "invalid_weekday")
        self.assertEqual(reject_reason(schedule(period="凌晨")), "invalid_period")

    def test_reject_penghu_sources(self) -> None:
        self.assertEqual(reject_reason(schedule(branch_name="澎湖院區")), "excluded_location")

    def test_partition_publishable_keeps_valid_rows(self) -> None:
        publishable, rejected = partition_publishable([schedule(), schedule(confidence=0.2)])

        self.assertEqual(len(publishable), 1)
        self.assertEqual(len(rejected), 1)
        self.assertEqual(rejected[0].reason, "low_confidence")


def schedule(**overrides) -> RawSchedule:
    values = {
        "hospital_id": "test",
        "hospital_name": "測試醫院",
        "branch_name": "總院",
        "department": "心臟內科",
        "doctor_name": "王測試",
        "weekday": 1,
        "weekday_label": "星期一",
        "period": "上午",
        "room": "診間 1",
        "source_url": "https://example.test",
        "source_ref": "row:1",
        "confidence": 0.95,
        "raw_text": "王測試",
    }
    values.update(overrides)
    return RawSchedule(**values)


if __name__ == "__main__":
    unittest.main()
