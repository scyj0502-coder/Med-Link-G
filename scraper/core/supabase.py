from __future__ import annotations

import os
from typing import Any

import httpx

from adapters.base import HospitalSource, RawSchedule
from core.models import RejectedSchedule, ScheduleChange, schedule_payload


LEGACY_PUBLISHED_COLUMNS = {
    "schedule_key",
    "id",
    "sync_run_id",
    "hospital_id",
    "hospital_name",
    "branch_name",
    "department",
    "doctor_name",
    "weekday",
    "weekday_label",
    "period",
    "room",
    "source_url",
    "source_ref",
    "confidence",
    "published_at",
}


class SupabaseRestClient:
    def __init__(self, project_url: str, api_key: str) -> None:
        normalized_url = project_url.rstrip("/")
        if normalized_url.endswith("/rest/v1"):
            normalized_url = normalized_url.removesuffix("/rest/v1")
        self.base_url = normalized_url + "/rest/v1"
        self.headers = {
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        with httpx.Client(timeout=30) as client:
            response = client.get(f"{self.base_url}/{table}", headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()

    def insert(self, table: str, payload: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
        headers = self.headers | {"Prefer": "return=representation"}
        with httpx.Client(timeout=30) as client:
            response = client.post(f"{self.base_url}/{table}", headers=headers, json=payload)
            response.raise_for_status()
            return response.json()

    def upsert(
        self,
        table: str,
        payload: list[dict[str, Any]],
        on_conflict: str,
    ) -> list[dict[str, Any]]:
        headers = self.headers | {"Prefer": "resolution=merge-duplicates,return=representation"}
        params = {"on_conflict": on_conflict}
        with httpx.Client(timeout=30) as client:
            response = client.post(f"{self.base_url}/{table}", headers=headers, params=params, json=payload)
            response.raise_for_status()
            return response.json()


class SupabaseScheduleWriter:
    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client

    @classmethod
    def from_env(cls) -> "SupabaseScheduleWriter":
        url = (os.environ.get("SUPABASE_URL") or "").strip()
        key = (
            os.environ.get("SUPABASE_SECRET_KEY")
            or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            or ""
        ).strip()
        if not url or not key:
            raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.")
        return cls(SupabaseRestClient(url, key))

    def load_published(self, hospital_id: str) -> list[dict]:
        return self.client.select(
            "published_schedules",
            {"select": "*", "hospital_id": f"eq.{hospital_id}"},
        )

    def write_run(
        self,
        source: HospitalSource,
        publishable: list[RawSchedule],
        rejected: list[RejectedSchedule],
        changes: list[ScheduleChange],
    ) -> None:
        self.client.upsert("hospitals", [{
            "id": source.id,
            "region": source.region,
            "hospital_name": source.hospital_name,
            "branch_name": source.branch_name,
            "schedule_url": source.schedule_url,
            "enabled": source.enabled,
        }], on_conflict="id")

        run = self.client.insert("sync_runs", {
            "hospital_id": source.id,
            "status": "ok" if not rejected else "needs_attention",
            "scraped_count": len(publishable) + len(rejected),
            "published_count": len(publishable),
            "rejected_count": len(rejected),
        })[0]

        payloads = [schedule_payload(item) | {"sync_run_id": run["id"]} for item in publishable]
        if payloads:
            try:
                self.client.upsert("published_schedules", payloads, on_conflict="schedule_key")
            except httpx.HTTPStatusError as exc:
                if not is_missing_column_error(exc):
                    raise
                legacy_payloads = [
                    {key: value for key, value in payload.items() if key in LEGACY_PUBLISHED_COLUMNS}
                    for payload in payloads
                ]
                self.client.upsert("published_schedules", legacy_payloads, on_conflict="schedule_key")

        rejected_payloads = [
            {
                "sync_run_id": run["id"],
                "hospital_id": source.id,
                "reason": item.reason,
                "payload": schedule_payload(item.item),
            }
            for item in rejected
        ]
        if rejected_payloads:
            self.client.insert("rejected_schedules", rejected_payloads)

        change_payloads = [
            {
                "sync_run_id": run["id"],
                "hospital_id": source.id,
                "change_type": item.change_type,
                "schedule_key": item.schedule_key,
                "message": item.message,
                "before_payload": item.before,
                "after_payload": item.after,
            }
            for item in changes
        ]
        if change_payloads:
            self.client.insert("schedule_changes", change_payloads)


def is_missing_column_error(exc: httpx.HTTPStatusError) -> bool:
    if exc.response.status_code not in {400, 404}:
        return False
    text = exc.response.text.lower()
    return "column" in text and ("not found" in text or "could not find" in text)
