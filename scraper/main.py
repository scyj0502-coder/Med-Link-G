from __future__ import annotations

import argparse
from pathlib import Path

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


def run(target: str | None = None) -> None:
    load_dotenv()
    config = load_config(Path("config.yaml"))
    writer = SupabaseScheduleWriter.from_env()
    notifier = TelegramNotifier.from_env()
    sources = selected_sources(config.hospitals, target)

    for source in sources:
        adapter_cls = ADAPTERS[source.adapter]
        adapter = adapter_cls(source)
        try:
            scraped = adapter.fetch()
        except Exception as exc:
            writer.write_failed_run(source, str(exc))
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

        print(
            f"{source.id}: scraped={len(scraped)} "
            f"published={len(publishable)} rejected={len(rejected)} changes={len(changes)} "
            f"preserve_stale={preserve_stale}"
        )


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


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Med-Link schedule sync.")
    parser.add_argument("target", nargs="?", help="Hospital id or adapter name, e.g. kmugh.")
    args = parser.parse_args()
    run(args.target)


if __name__ == "__main__":
    main()
