from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.base import RawSchedule
from main import should_preserve_stale


class SyncSafetyTest(unittest.TestCase):
    def test_preserve_stale_when_publishable_drops_too_much(self) -> None:
        previous = [{"schedule_key": f"old-{index}"} for index in range(100)]
        publishable = [schedule(index) for index in range(40)]

        self.assertTrue(should_preserve_stale(previous, publishable))

    def test_allow_stale_delete_for_small_sources(self) -> None:
        previous = [{"schedule_key": f"old-{index}"} for index in range(10)]
        publishable: list[RawSchedule] = []

        self.assertFalse(should_preserve_stale(previous, publishable))

    def test_allow_stale_delete_when_count_is_stable(self) -> None:
        previous = [{"schedule_key": f"old-{index}"} for index in range(100)]
        publishable = [schedule(index) for index in range(80)]

        self.assertFalse(should_preserve_stale(previous, publishable))


def schedule(index: int) -> RawSchedule:
    return RawSchedule(
        hospital_id="test",
        hospital_name="測試醫院",
        branch_name="總院",
        department="心臟內科",
        doctor_name=f"王測{index}",
        weekday=1,
        weekday_label="星期一",
        period="上午",
        room="診間 1",
        source_url="https://example.test",
        source_ref=f"row:{index}",
        confidence=0.9,
        raw_text=f"王測{index}",
    )


if __name__ == "__main__":
    unittest.main()
