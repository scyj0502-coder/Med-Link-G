from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from adapters.cgmh_text import CgmhTextAdapter
from adapters.cgmh_image import CgmhImageAdapter
from adapters.base import HospitalSource
from adapters.edah_pdf import EdahPdfAdapter
from adapters.antai_image import AntaiImageAdapter
from adapters.kmugh import KmughAdapter
from adapters.pingtung_mohw import PingtungMohwAdapter
from adapters.ptvgh_pdf import PtvghPdfAdapter
from adapters.shinkao import ShinkaoAdapter
from core.diff import detect_changes
from core.quality import partition_publishable
from core.supabase import SupabaseScheduleWriter
from core.telegram import TelegramNotifier
from core.yaml_config import load_config


ADAPTERS = {
    "cgmh_image": CgmhImageAdapter,
    "cgmh_text": CgmhTextAdapter,
    "edah_pdf": EdahPdfAdapter,
    "antai_image": AntaiImageAdapter,
    "kmugh": KmughAdapter,
    "pingtung_mohw": PingtungMohwAdapter,
    "ptvgh_pdf": PtvghPdfAdapter,
    "shinkao": ShinkaoAdapter,
}

SERVICE_REGIONS = {"台南", "高雄", "屏東"}


def run(target: str | None = None) -> list[dict[str, Any]]:
    load_dotenv()
    config = load_config(Path("config.yaml"))
    writer = SupabaseScheduleWriter.from_env()
    notifier = TelegramNotifier.from_env()
    sources = selected_sources(config.hospitals, target)
    results: list[dict[str, Any]] = []

    for source in sources:
        adapter_cls = ADAPTERS[source.adapter]
        adapter = adapter_cls(source)
        try:
            scraped = adapter.fetch()
        except Exception as exc:
            writer.write_failed_run(source, str(exc))
            notifier.send_sync_failure(source, str(exc))
            results.append({
                "source_id": source.id,
                "hospital_name": source.hospital_name,
                "branch_name": source.branch_name,
                "status": "parse_failed",
                "scraped": 0,
                "published": 0,
                "rejected": 0,
                "changes": 0,
                "preserve_stale": False,
                "error": str(exc),
            })
            print(f"{source.id}: parse_failed error={exc}")
            continue
        publishable, rejected = partition_publishable(scraped)
        previous = writer.load_published(source.id)
        preserve_stale = should_preserve_stale(previous, publishable)
        changes = detect_changes(previous, publishable)
        if preserve_stale:
            changes = [change for change in changes if change.change_type != "removed"]
        writer.write_run(source, publishable, rejected, changes, preserve_stale=preserve_stale)

        if changes:
            notifier.send_changes(source, changes)
        if rejected:
            notifier.send_quality_warning(source, rejected)

        status = "ok" if publishable and not rejected else "needs_attention" if publishable else "parse_failed"
        if status == "parse_failed":
            notifier.send_sync_failure(source, "No publishable schedules were parsed.")
        results.append({
            "source_id": source.id,
            "hospital_name": source.hospital_name,
            "branch_name": source.branch_name,
            "status": status,
            "scraped": len(scraped),
            "published": len(publishable),
            "rejected": len(rejected),
            "changes": len(changes),
            "previous": len(previous),
            "preserve_stale": preserve_stale,
            "error": "",
        })
        print(
            f"{source.id}: scraped={len(scraped)} "
            f"published={len(publishable)} rejected={len(rejected)} changes={len(changes)} "
            f"preserve_stale={preserve_stale}"
        )
    write_sync_summary(results, Path("sync-summary.json"), Path("sync-summary.md"))
    return results


def selected_sources(sources: list[HospitalSource], target: str | None = None) -> list[HospitalSource]:
    target = (target or "").strip()
    selected: list[HospitalSource] = []
    skipped_regions: list[str] = []

    for source in sources:
        if not source.enabled:
            continue
        if source.region not in SERVICE_REGIONS:
            skipped_regions.append(f"{source.id}:{source.region}")
            continue
        if target and source.id != target and source.adapter != target:
            continue
        selected.append(source)

    if skipped_regions:
        print(f"skipped unsupported regions: {', '.join(skipped_regions)}")
    if target and not selected:
        available = ", ".join(source.id for source in sources if source.enabled)
        raise SystemExit(f"Unknown enabled sync target '{target}'. Available enabled hospital ids: {available}")
    return selected


def should_preserve_stale(previous: list[dict], publishable: list) -> bool:
    if len(previous) < 20:
        return False
    return len(publishable) < len(previous) * 0.5


def write_sync_summary(results: list[dict[str, Any]], json_path: Path, markdown_path: Path) -> None:
    json_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = [
        "### 來源同步總表",
        "",
        "| 來源 | 狀態 | 抓取 | 發布 | 異常 | 異動 | 保留上一版 | 備註 |",
        "|---|---:|---:|---:|---:|---:|---|---|",
    ]
    if not results:
        lines.append("| 無 | - | 0 | 0 | 0 | 0 | - | 沒有符合條件的啟用來源 |")
    for item in results:
        label = f"{item['hospital_name']} {item['branch_name']}".strip()
        note = item.get("error") or ""
        if item.get("status") == "needs_attention":
            note = "部分資料被品質規則擋下，前台只發布可信資料"
        elif item.get("preserve_stale"):
            note = "本次資料少於上一版，已保留上一版未出現資料"
        lines.append(
            "| "
            + " | ".join([
                escape_markdown_table(label),
                sync_status_label(str(item.get("status", ""))),
                str(item.get("scraped", 0)),
                str(item.get("published", 0)),
                str(item.get("rejected", 0)),
                str(item.get("changes", 0)),
                "是" if item.get("preserve_stale") else "否",
                escape_markdown_table(str(note)),
            ])
            + " |"
        )
    markdown_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def sync_status_label(status: str) -> str:
    if status == "ok":
        return "正常"
    if status == "needs_attention":
        return "部分異常"
    if status == "parse_failed":
        return "更新異常"
    return status or "未知"


def escape_markdown_table(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def has_parse_failures(results: list[dict[str, Any]]) -> bool:
    return any(item.get("status") == "parse_failed" for item in results)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Med-Link schedule sync.")
    parser.add_argument("target", nargs="?", help="Hospital id or adapter name, e.g. kmugh.")
    args = parser.parse_args()
    results = run(args.target)
    if has_parse_failures(results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
