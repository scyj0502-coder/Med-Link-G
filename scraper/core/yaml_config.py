from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

from adapters.base import HospitalSource


@dataclass(frozen=True)
class ScraperConfig:
    hospitals: list[HospitalSource]


def load_config(path: Path) -> ScraperConfig:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    hospitals = [HospitalSource(**item) for item in payload.get("hospitals", [])]
    return ScraperConfig(hospitals=hospitals)

