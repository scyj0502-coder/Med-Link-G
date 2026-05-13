from __future__ import annotations

from adapters.base import RawSchedule, ScheduleAdapter


class EdahPdfAdapter(ScheduleAdapter):
    """E-DA PDF source placeholder.

    E-DA publishes separate image-based PDF schedules for:
    - 義大醫院
    - 義大癌治療醫院
    - 義大大昌醫院

    The current PDFs do not expose extractable text via pypdf, so this adapter
    stays disabled in config until the OCR/table extraction pipeline is added.
    """

    def fetch(self) -> list[RawSchedule]:
        raise NotImplementedError("E-DA PDF OCR parser is not implemented yet.")
