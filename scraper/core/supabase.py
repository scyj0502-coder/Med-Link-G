from __future__ import annotations

import os
from typing import Any

import httpx

from adapters.base import HospitalSource, RawSchedule
from core.models import RejectedSchedule, ScheduleChange, schedule_payload


BASE_PUBLISHED_COLUMNS = {
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
PARSE_METADATA_COLUMNS = BASE_PUBLISHED_COLUMNS | {
    "note",
    "raw_text",
    "source_page",
    "parsed_at",
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

    def delete(self, table: str, params: dict[str, str]) -> None:
        with httpx.Client(timeout=30) as client:
            response = client.delete(f"{self.base_url}/{table}", headers=self.headers, params=params)
            response.raise_for_status()

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
        preserve_stale: bool = False,
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
            "status": "ok" if publishable and not rejected else "needs_attention" if publishable else "parse_failed",
            "scraped_count": len(publishable) + len(rejected),
            "published_count": len(publishable),
            "rejected_count": len(rejected),
        })[0]

        payloads = [schedule_payload(item) | {"sync_run_id": run["id"]} for item in publishable]
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

        if not payloads:
            return

        written_payloads = self.upsert_published(payloads)
        if not preserve_stale:
            self.delete_stale_published(source.id, {item["schedule_key"] for item in written_payloads})

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

    def write_failed_run(self, source: HospitalSource, error: str) -> None:
        self.client.upsert("hospitals", [{
            "id": source.id,
            "region": source.region,
            "hospital_name": source.hospital_name,
            "branch_name": source.branch_name,
            "schedule_url": source.schedule_url,
            "enabled": source.enabled,
        }], on_conflict="id")
        self.client.insert("sync_runs", {
            "hospital_id": source.id,
            "status": "parse_failed",
            "scraped_count": 0,
            "published_count": 0,
            "rejected_count": 0,
        })

    def upsert_published(self, payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
        try:
            self.client.upsert("published_schedules", payloads, on_conflict="schedule_key")
            return payloads
        except httpx.HTTPStatusError as exc:
            if not is_missing_column_error(exc):
                raise

        metadata_payloads = [
            {key: value for key, value in payload.items() if key in PARSE_METADATA_COLUMNS}
            for payload in payloads
        ]
        try:
            self.client.upsert("published_schedules", metadata_payloads, on_conflict="schedule_key")
            return metadata_payloads
        except httpx.HTTPStatusError as metadata_exc:
            if not is_missing_column_error(metadata_exc):
                raise

        base_payloads = [
            {key: value for key, value in payload.items() if key in BASE_PUBLISHED_COLUMNS}
            for payload in payloads
        ]
        self.client.upsert("published_schedules", base_payloads, on_conflict="schedule_key")
        return base_payloads

    def delete_stale_published(self, hospital_id: str, current_keys: set[str]) -> None:
        existing = self.load_published(hospital_id)
        for row in existing:
            key = row.get("schedule_key")
            if key and key not in current_keys:
                self.client.delete("published_schedules", {"schedule_key": f"eq.{key}"})


def is_missing_column_error(exc: httpx.HTTPStatusError) -> bool:
    if exc.response.status_code not in {400, 404}:
        return False
    text = exc.response.text.lower()
    return "column" in text and ("not found" in text or "could not find" in text)
