from __future__ import annotations

import os

import httpx

from adapters.base import HospitalSource
from core.models import RejectedSchedule, ScheduleChange


class TelegramNotifier:
    def __init__(self, token: str | None, maintainer_chat_id: str | None) -> None:
        self.token = token
        self.maintainer_chat_id = maintainer_chat_id

    @classmethod
    def from_env(cls) -> "TelegramNotifier":
        return cls(
            (os.environ.get("TELEGRAM_BOT_TOKEN") or "").strip(),
            (os.environ.get("TELEGRAM_MAINTAINER_CHAT_ID") or "").strip(),
        )

    def send_changes(self, source: HospitalSource, changes: list[ScheduleChange]) -> None:
        text = "\n".join([f"{source.branch_name} 門診異動", *[item.message for item in changes[:10]]])
        self._send(text)

    def send_quality_warning(self, source: HospitalSource, rejected: list[RejectedSchedule]) -> None:
        text = f"{source.branch_name} 有 {len(rejected)} 筆資料未發布，請檢查爬蟲品質報告。"
        self._send(text)

    def send_sync_failure(self, source: HospitalSource, error: str) -> None:
        text = "\n".join([
            f"{source.branch_name} 門診同步失敗",
            f"醫院：{source.hospital_name}",
            f"來源：{source.schedule_url}",
            f"原因：{error[:500]}",
            "系統會保留上一版可用資料供前台查詢。",
        ])
        self._send(text)

    def _send(self, text: str) -> None:
        if not self.token or not self.maintainer_chat_id:
            return
        url = f"https://api.telegram.org/bot{self.token}/sendMessage"
        try:
            httpx.post(url, json={"chat_id": self.maintainer_chat_id, "text": text}, timeout=15)
        except httpx.HTTPError as exc:
            print(f"telegram_notify_failed: {exc}")
