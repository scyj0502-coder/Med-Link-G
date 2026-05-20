from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.base import RawSchedule
from adapters.base import HospitalSource
from main import selected_sources, should_preserve_stale


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

    def test_selected_sources_filters_disabled_and_unsupported_regions(self) -> None:
        sources = [
            hospital_source("kmugh", "kmugh", True, "高雄"),
            hospital_source("disabled", "kmugh", False, "高雄"),
            hospital_source("taipei", "kmugh", True, "台北"),
        ]

        self.assertEqual([source.id for source in selected_sources(sources)], ["kmugh"])

    def test_selected_sources_accepts_hospital_id_or_adapter_target(self) -> None:
        sources = [
            hospital_source("kmugh", "kmugh", True, "高雄"),
            hospital_source("edah-main", "edah_pdf", True, "高雄"),
            hospital_source("edah-dachang", "edah_pdf", True, "高雄"),
        ]

        self.assertEqual([source.id for source in selected_sources(sources, "kmugh")], ["kmugh"])
        self.assertEqual([source.id for source in selected_sources(sources, "edah_pdf")], ["edah-main", "edah-dachang"])

    def test_selected_sources_fails_unknown_target(self) -> None:
        with self.assertRaises(SystemExit):
            selected_sources([hospital_source("kmugh", "kmugh", True, "高雄")], "missing")


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


def hospital_source(source_id: str, adapter: str, enabled: bool, region: str) -> HospitalSource:
    return HospitalSource(
        id=source_id,
        enabled=enabled,
        adapter=adapter,
        region=region,
        hospital_name="測試醫院",
        branch_name="總院",
        departments=[],
        schedule_url="https://example.test",
    )


if __name__ == "__main__":
    unittest.main()
