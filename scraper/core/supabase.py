from __future__ import annotations

import os

from supabase import Client, create_client

from adapters.base import HospitalSource, RawSchedule
from core.models import RejectedSchedule, ScheduleChange, schedule_payload


class SupabaseScheduleWriter:
    def __init__(self, client: Client) -> None:
        self.client = client

    @classmethod
    def from_env(cls) -> "SupabaseScheduleWriter":
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
        return cls(create_client(url, key))

    def load_published(self, hospital_id: str) -> list[dict]:
        response = (
            self.client.table("published_schedules")
            .select("*")
            .eq("hospital_id", hospital_id)
            .execute()
        )
        return response.data or []

    def write_run(
        self,
        source: HospitalSource,
        publishable: list[RawSchedule],
        rejected: list[RejectedSchedule],
        changes: list[ScheduleChange],
    ) -> None:
        run = self.client.table("sync_runs").insert({
            "hospital_id": source.id,
            "status": "ok" if not rejected else "needs_attention",
            "scraped_count": len(publishable) + len(rejected),
            "published_count": len(publishable),
            "rejected_count": len(rejected),
        }).execute().data[0]

        payloads = [schedule_payload(item) | {"sync_run_id": run["id"]} for item in publishable]
        if payloads:
            self.client.table("published_schedules").upsert(payloads, on_conflict="schedule_key").execute()

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
            self.client.table("rejected_schedules").insert(rejected_payloads).execute()

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
            self.client.table("schedule_changes").insert(change_payloads).execute()

