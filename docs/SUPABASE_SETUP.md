# Supabase Setup

Use this guide when creating the Med-Link Supabase project.

## Create Project

1. Open the Supabase dashboard.
2. Create a new project.
3. Recommended values:

```text
Project name : med-link
Region       : Northeast Asia / Tokyo, if available
```

Supabase will ask for a database password during project creation. Keep it in a
password manager or another private place. Do not paste it into chat and do not
commit it to this repository.

## Get Project Values

After the project is ready, open:

```text
Project Settings -> API Keys
```

Copy only these values into `.local-secrets.txt`:

```text
Supabase
==========================================
Project URL         :
Publishable key     :
Secret key          :
```

Use the `sb_publishable_...` key for `Publishable key` and the `sb_secret_...`
key for `Secret key`. Legacy `anon` and `service_role` keys are still accepted
by the setup script, but the new key names match the current Supabase dashboard.

## Generate Local Env Files

Run this from the repository root:

```powershell
.\scripts\setup-local-env.ps1
```

It creates:

```text
apps/web/.env.local
scraper/.env
```

## Apply Database Schema

In Supabase, open:

```text
SQL Editor -> New query
```

Paste and run:

```text
db/migrations/0001_initial.sql
```

This creates the tables used by the current app:

- `hospitals`
- `sync_runs`
- `published_schedules`
- `rejected_schedules`
- `schedule_changes`

The public website can read only active hospitals and published schedules.
Crawler writes use the secret key and should stay server-side only.

## GitHub Actions Secrets Later

When we are ready to run the scheduled crawler on GitHub Actions, add these
repository secrets:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_MAINTAINER_CHAT_ID
```

Do this later, after local Supabase connection works.
