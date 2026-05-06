from dataclasses import dataclass
from datetime import date, datetime
from hashlib import sha256
from typing import Iterable


@dataclass(frozen=True)
class RawClinicSession:
    hospital_id: str
    doctor_name: str
    department: str
    clinic_date: date
    period: str
    room: str
    status_text: str
    specialty: str = ""
    substitute_doctor: str = ""


@dataclass(frozen=True)
class NormalizedAppointment:
    id: str
    hospital_id: str
    doctor_id: str
    clinic_date: date
    weekday: int
    period: str
    room: str
    status: str
    specialty: str
    substitute_doctor: str
    source_hash: str


STATUS_MAP = {
    "停診": "cancelled",
    "休診": "cancelled",
    "代診": "substitute",
    "調診": "changed",
}


def fetch_hospital_schedule(source_url: str) -> str:
    """Fetch one hospital schedule page or API response."""
    raise NotImplementedError("Connect requests, Scrapy, or Playwright here.")


def parse_schedule(hospital_id: str, payload: str) -> Iterable[RawClinicSession]:
    """Parse hospital-specific payload into raw clinic sessions."""
    raise NotImplementedError("Implement one parser per hospital source.")


def normalize_session(raw: RawClinicSession, doctor_id: str) -> NormalizedAppointment:
    status = "normal"
    for keyword, mapped_status in STATUS_MAP.items():
        if keyword in raw.status_text:
            status = mapped_status
            break

    stable_key = "|".join(
        [
            raw.hospital_id,
            doctor_id,
            raw.clinic_date.isoformat(),
            raw.period,
            raw.room,
            status,
            raw.substitute_doctor,
        ]
    )
    digest = sha256(stable_key.encode("utf-8")).hexdigest()
    appointment_id = f"{raw.hospital_id}-{doctor_id}-{raw.clinic_date.isoformat()}-{raw.period}"

    return NormalizedAppointment(
        id=appointment_id,
        hospital_id=raw.hospital_id,
        doctor_id=doctor_id,
        clinic_date=raw.clinic_date,
        weekday=raw.clinic_date.weekday() + 1,
        period=raw.period,
        room=raw.room,
        status=status,
        specialty=raw.specialty,
        substitute_doctor=raw.substitute_doctor,
        source_hash=digest,
    )


def detect_change(previous: NormalizedAppointment | None, current: NormalizedAppointment) -> dict | None:
    if previous is None:
        return None
    if previous.source_hash == current.source_hash:
        return None

    fields = ["period", "room", "status", "substitute_doctor"]
    changed_fields = [
        field
        for field in fields
        if getattr(previous, field) != getattr(current, field)
    ]
    return {
        "appointment_id": current.id,
        "change_type": current.status if current.status != "normal" else "updated",
        "message": f"{current.clinic_date} 診表異動：{', '.join(changed_fields)}",
        "detected_at": datetime.now().isoformat(timespec="seconds"),
    }


def sync_all_sources() -> None:
    """Orchestrate fetch, parse, normalize, diff, persist, and notify."""
    raise NotImplementedError("Load hospital sources, persist appointments, then send notifications.")
