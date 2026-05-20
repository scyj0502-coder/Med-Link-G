from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from adapters.base import HospitalSource
from core.telegram import TelegramNotifier


class TelegramNotifierTest(unittest.TestCase):
    def test_sync_failure_notice_includes_source_context(self) -> None:
        sent_payloads: list[dict] = []

        def fake_post(url: str, json: dict, timeout: int) -> object:
            sent_payloads.append({"url": url, "json": json, "timeout": timeout})
            return object()

        notifier = TelegramNotifier("token", "chat-id")
        with patch("core.telegram.httpx.post", side_effect=fake_post):
            notifier.send_sync_failure(source(), "PDF table layout changed")

        self.assertEqual(len(sent_payloads), 1)
        payload = sent_payloads[0]["json"]
        self.assertEqual(payload["chat_id"], "chat-id")
        self.assertIn("門診同步失敗", payload["text"])
        self.assertIn("測試醫院", payload["text"])
        self.assertIn("PDF table layout changed", payload["text"])
        self.assertIn("保留上一版", payload["text"])

    def test_telegram_http_error_does_not_raise(self) -> None:
        notifier = TelegramNotifier("token", "chat-id")
        with patch("core.telegram.httpx.post", side_effect=httpx.ConnectError("network down")):
            notifier.send_sync_failure(source(), "network down")

    def test_missing_telegram_settings_are_noop(self) -> None:
        notifier = TelegramNotifier("", "")
        with patch("core.telegram.httpx.post") as post:
            notifier.send_sync_failure(source(), "network down")

        post.assert_not_called()


def source() -> HospitalSource:
    return HospitalSource(
        id="test",
        enabled=True,
        adapter="kmugh",
        region="高雄",
        hospital_name="測試醫院",
        branch_name="總院",
        departments=[],
        schedule_url="https://example.test/schedule.pdf",
    )


if __name__ == "__main__":
    unittest.main()
