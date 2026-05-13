# Med-Link Formal Product Direction

## Product Boundary

Med-Link has two separate surfaces:

- Sales app: search published schedules, track doctors, view confirmed changes, and receive Telegram alerts.
- System pipeline: crawl, normalize, quality-check, diff, store, and notify maintainers when data quality fails.

Sales users should not handle OCR validation or data maintenance tasks. If data is uncertain, it must not be published to the sales app.

## Service Area

The production service area is limited to:

- 台南
- 高雄
- 屏東

Sources or parsed records for 澎湖 / Penghu are excluded from publication.

## Current Prototype Role

The current static GitHub Pages app remains a prototype for:

- UX validation.
- Schedule filtering behavior.
- Okayama Hospital data shape.
- Calendar and daily schedule presentation.

It is not the long-term production architecture.

## Formal Architecture

```text
apps/web/              Next.js PWA on Vercel
scraper/               Python crawler on GitHub Actions
db/migrations/         Supabase PostgreSQL schema
.github/workflows/     Scheduled sync jobs
```

## First Vertical Slice

Start with one enabled source:

- Hospital: Kaohsiung Medical University Hospital, Okayama Hospital
- Departments: cardiovascular medicine, hepatobiliary medicine
- Flow: crawl -> normalize -> quality gate -> write Supabase -> render published schedules -> Telegram alert for confirmed changes

## Publication Rule

Only published records are visible in the sales app. Internal review records can exist for maintainers, but they are not part of the sales workflow.
