from __future__ import annotations

import argparse
from pathlib import Path

from dotenv import load_dotenv

from adapters.cgmh_text import CgmhTextAdapter
from adapters.cgmh_image import CgmhImageAdapter
from adapters.edah_pdf import EdahPdfAdapter
from adapters.kmugh import KmughAdapter
from adapters.pingtung_mohw import PingtungMohwAdapter
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
    "kmugh": KmughAdapter,
    "pingtung_mohw": PingtungMohwAdapter,
    "shinkao": ShinkaoAdapter,
}

SERVICE_REGIONS = {"台南", "高雄", "屏東"}


def run(target: str | None = None) -> None:
    load_dotenv()
    config = load_config(Path("config.yaml"))
    writer = SupabaseScheduleWriter.from_env()
    notifier = TelegramNotifier.from_env()

    for source in config.hospitals:
        if not source.enabled:
            continue
        if source.region not in SERVICE_REGIONS:
            print(f"{source.id}: skipped unsupported region={source.region}")
            continue
        if target and source.id != target and source.adapter != target:
            continue

        adapter_cls = ADAPTERS[source.adapter]
        adapter = adapter_cls(source)
        scraped = adapter.fetch()
        publishable, rejected = partition_publishable(scraped)
        previous = writer.load_published(source.id)
        changes = detect_changes(previous, publishable)
        writer.write_run(source, publishable, rejected, changes)

        if changes:
            notifier.send_changes(source, changes)
        if rejected:
            notifier.send_quality_warning(source, rejected)

        print(
            f"{source.id}: scraped={len(scraped)} "
            f"published={len(publishable)} rejected={len(rejected)} changes={len(changes)}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Med-Link schedule sync.")
    parser.add_argument("target", nargs="?", help="Hospital id or adapter name, e.g. kmugh.")
    args = parser.parse_args()
    run(args.target)


if __name__ == "__main__":
    main()
