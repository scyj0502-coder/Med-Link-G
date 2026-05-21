from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.base import RawSchedule
from adapters.base import HospitalSource
from main import has_parse_failures, rejected_reason_summary, selected_sources, should_preserve_stale, sync_totals, write_sync_summary


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

    def test_write_sync_summary_outputs_json_and_markdown(self) -> None:
        temp_dir = Path(__file__).resolve().parent / "__tmp_sync_summary__"
        temp_dir.mkdir(exist_ok=True)
        json_path = temp_dir / "sync-summary.json"
        markdown_path = temp_dir / "sync-summary.md"

        try:
            write_sync_summary([
                {
                    "source_id": "kmugh",
                    "hospital_name": "高醫岡山",
                    "branch_name": "總院",
                    "status": "ok",
                    "scraped": 33,
                    "published": 33,
                    "rejected": 0,
                    "rejected_reasons": {},
                    "changes": 2,
                    "preserve_stale": False,
                    "error": "",
                }
            ], json_path, markdown_path)

            self.assertIn('"source_id": "kmugh"', json_path.read_text(encoding="utf-8"))
            markdown = markdown_path.read_text(encoding="utf-8")
            self.assertIn("來源同步總表", markdown)
            self.assertIn("抓取：33 筆", markdown)
            self.assertIn("高醫岡山 總院", markdown)
            self.assertIn("正常", markdown)
        finally:
            if json_path.exists():
                json_path.unlink()
            if markdown_path.exists():
                markdown_path.unlink()
            if temp_dir.exists():
                temp_dir.rmdir()

    def test_has_parse_failures_detects_failed_sources(self) -> None:
        self.assertTrue(has_parse_failures([
            {"source_id": "ok", "status": "ok"},
            {"source_id": "failed", "status": "parse_failed"},
        ]))
        self.assertFalse(has_parse_failures([
            {"source_id": "ok", "status": "ok"},
            {"source_id": "partial", "status": "needs_attention"},
        ]))

    def test_sync_totals_and_rejected_reason_summary(self) -> None:
        totals = sync_totals([
            {"status": "ok", "scraped": 10, "published": 10, "rejected": 0, "changes": 1},
            {"status": "needs_attention", "scraped": 8, "published": 6, "rejected": 2, "changes": 0},
        ])

        self.assertEqual(totals["sources"], 2)
        self.assertEqual(totals["ok"], 1)
        self.assertEqual(totals["needs_attention"], 1)
        self.assertEqual(totals["scraped"], 18)
        self.assertEqual(totals["rejected"], 2)
        self.assertEqual(rejected_reason_summary({"low_confidence": 2, "missing_department": 1}), "low_confidence 2 筆、missing_department 1 筆")


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
