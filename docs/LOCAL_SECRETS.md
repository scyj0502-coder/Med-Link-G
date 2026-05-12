# Local Secrets Workflow

This project supports one local-only source of truth for credentials:

```text
.local-secrets.txt
```

This file is ignored by Git and must never be committed.

## Setup

1. Copy the example file:

```powershell
Copy-Item .local-secrets.example .local-secrets.txt
```

2. Fill `.local-secrets.txt` locally. It can look like a human notebook:

```text
Telegram Bot
==========================================
Bot name            : MedLinkBot
Bot username        : @med_link_bot
Bot token           : 123456:ABC-DEF...
```

Supabase can use the same notebook style:

```text
Supabase
==========================================
Project name        : med-link
Region              : Tokyo
Database password   : keep-this-local
Project Ref         : abcdefghijk
Project URL         : https://abcdefghijk.supabase.co
Publishable key     : eyJ...
Secret key          : sb_secret_...
SUPABASE_DB_URL     : postgresql://...
```

The setup script also accepts classic `.env` style:

```text
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
```

3. Generate app-specific env files:

```powershell
.\scripts\setup-local-env.ps1
```

The script creates:

```text
apps/web/.env.local
scraper/.env
```

## Key Placement

| Key | Goes To | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `apps/web/.env.local` | Frontend Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `apps/web/.env.local` | Frontend public anon key |
| `SUPABASE_URL` | `scraper/.env` | Scraper Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `scraper/.env` | Server-side database writes |
| `TELEGRAM_BOT_TOKEN` | `scraper/.env` | Telegram notification bot |
| `TELEGRAM_MAINTAINER_CHAT_ID` | `scraper/.env` | Internal data-quality alerts |

## Supported Human Labels

The setup script maps these labels automatically:

| Human label | Env key |
|---|---|
| `Project URL` | `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` fallback |
| `Anon key` / `Publishable key` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `Service role key` / `Secret key` | `SUPABASE_SERVICE_ROLE_KEY` |
| `Project Ref` | `SUPABASE_PROJECT_REF` |
| `SUPABASE_DB_URL` / `Postgres connection string` | `SUPABASE_DB_URL` |
| `Bot token` | `TELEGRAM_BOT_TOKEN` |
| `Maintainer chat id` / `Chat id` | `TELEGRAM_MAINTAINER_CHAT_ID` |

## Safety Rules

- Do not paste `SUPABASE_SERVICE_ROLE_KEY` into chat.
- Do not put service role keys in `apps/web`.
- GitHub Actions should use repository Secrets with the same key names.
- Screenshots with hidden values are okay for navigation help.
