from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Any

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.supabase import SupabaseScheduleWriter


class SupabaseWriterTest(unittest.TestCase):
    def test_insert_sync_run_retries_without_error_message_for_older_schema(self) -> None:
        client = FallbackClient()
        writer = SupabaseScheduleWriter(client)  # type: ignore[arg-type]

        result = writer.insert_sync_run({
            "hospital_id": "kmugh",
            "status": "parse_failed",
            "scraped_count": 0,
            "published_count": 0,
            "rejected_count": 0,
            "finished_at": "2026-05-21T00:00:00+00:00",
            "error_message": "parser failed",
        })

        self.assertEqual(result, [{"id": 7}])
        self.assertEqual(len(client.payloads), 2)
        self.assertIn("error_message", client.payloads[0])
        self.assertNotIn("error_message", client.payloads[1])


class FallbackClient:
    def __init__(self) -> None:
        self.payloads: list[dict[str, Any]] = []

    def insert(self, table: str, payload: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
        self.assert_table(table)
        assert isinstance(payload, dict)
        self.payloads.append(payload)
        if "error_message" in payload:
            request = httpx.Request("POST", "https://example.supabase.co/rest/v1/sync_runs")
            response = httpx.Response(400, request=request, text='{"message":"Could not find the error_message column"}')
            raise httpx.HTTPStatusError("missing column", request=request, response=response)
        return [{"id": 7}]

    def assert_table(self, table: str) -> None:
        if table != "sync_runs":
            raise AssertionError(table)


if __name__ == "__main__":
    unittest.main()
