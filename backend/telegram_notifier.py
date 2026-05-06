import os
from dataclasses import dataclass
from typing import Any
from urllib import parse, request


@dataclass(frozen=True)
class TelegramMessage:
    chat_id: str
    text: str
    parse_mode: str = "HTML"


class TelegramNotifier:
    def __init__(self, bot_token: str | None = None) -> None:
        token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
        if not token:
            raise ValueError("TELEGRAM_BOT_TOKEN is required")
        self.base_url = f"https://api.telegram.org/bot{token}"

    def send_message(self, message: TelegramMessage) -> dict[str, Any]:
        payload = {
            "chat_id": message.chat_id,
            "text": message.text,
            "parse_mode": message.parse_mode,
            "disable_web_page_preview": "true",
        }
        data = parse.urlencode(payload).encode("utf-8")
        req = request.Request(f"{self.base_url}/sendMessage", data=data, method="POST")
        with request.urlopen(req, timeout=15) as response:
            body = response.read().decode("utf-8")
        return {"ok": True, "response": body}


def format_change_message(change: dict[str, Any]) -> str:
    hospital = change.get("hospital_name", "院所")
    department = change.get("department", "科別")
    doctor = change.get("doctor_name", "醫師")
    clinic_date = change.get("clinic_date", "日期")
    period = change.get("period", "時段")
    status = change.get("status_label", "診表異動")
    note = change.get("note", "")
    return f"[醫點通] {hospital} {department} {doctor} {clinic_date} {period}：{status}。{note}"
