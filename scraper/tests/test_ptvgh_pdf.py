from __future__ import annotations

from adapters.ptvgh_pdf import extract_doctors, parse_table_row
from adapters.base import HospitalSource
from adapters.ptvgh_pdf import SourcePdf


def test_extract_doctors_keeps_cell_note() -> None:
    doctors = extract_doctors("鄭錦昌 0205\n(肺高壓暨瓣膜)\n康沛倫 0205")

    assert doctors == [("鄭錦昌", "肺高壓暨瓣膜"), ("康沛倫", "肺高壓暨瓣膜")]


def test_parse_table_row_maps_weekday_cells() -> None:
    source = HospitalSource(
        id="ptvgh",
        enabled=True,
        adapter="ptvgh_pdf",
        region="屏東",
        hospital_name="屏東榮民總醫院",
        branch_name="總院",
        departments=[],
        schedule_url="https://example.test/list",
    )
    row = [
        "",
        "心臟內科",
        "",
        "晚上",
        "0A",
        "呂書旭 0202",
        "",
        "",
        "",
        "",
        "",
        "",
    ]

    items = parse_table_row(
        source=source,
        row=row,
        row_index=2,
        page_number=1,
        source_pdf=SourcePdf(
            title="總院5月門診表背面.pdf",
            url="https://example.test/source.pdf",
            month=5,
            source_month="115年5月",
        ),
        file_hash="abc",
        fetched_at="2026-05-15T00:00:00+00:00",
    )

    assert len(items) == 1
    assert items[0].doctor_name == "呂書旭"
    assert items[0].period == "夜診"
    assert items[0].room == "0A"
    assert items[0].source_file_url == "https://example.test/source.pdf"
    assert items[0].file_hash == "abc"
