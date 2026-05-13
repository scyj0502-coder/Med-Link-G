# 醫點通 (Med-Link)

南台灣醫療通路業務診表整合平台。目標是自動取得高醫等醫院門診資料，
經過資料品質檢查後，只把可信任的門診動態提供給業務查詢，並在異動時
透過 Telegram 通知。

## 目前定位

這個 repo 目前同時保留兩條線：

- `index.html` / `app.js`：GitHub Pages 靜態原型，用來快速驗證查詢、看板與 UX。
- `apps/web` / `scraper` / `db`：正式化架構，準備接 Supabase、Next.js、Python 爬蟲與 GitHub Actions。

業務端不需要處理資料維護、OCR 待確認或人工驗證。這些問題應該留在系統內部，
由爬蟲、品質門檻與維護者通知處理；業務只看到已發布且可信的門診資料。

## 技術棧

| 層 | 選型 |
|---|---|
| 前端 | Next.js 15 App Router + TypeScript + Tailwind |
| API / DB Client | Supabase client |
| 爬蟲 | Python 3.11 + httpx + BeautifulSoup |
| 排程 | GitHub Actions cron |
| DB | Supabase PostgreSQL |
| 通知 | Telegram Bot API |

## 專案結構

```text
apps/web/              Next.js PWA
scraper/               Python 爬蟲、品質檢查、Supabase 寫入、Telegram 通知
db/migrations/         Supabase SQL schema
.github/workflows/     GitHub Actions 排程
backend/               舊版原型資料處理
data/                  舊版原型 JSON 資料
```

## 本機機密設定

本專案使用 `.local-secrets.txt` 作為本機唯一機密筆記來源，該檔案已被 Git 忽略。

```powershell
Copy-Item .local-secrets.example .local-secrets.txt
```

目前只需要記錄實際用到的欄位：

```text
Supabase
==========================================
Project URL         :
Publishable key     :
Secret key          :

Telegram Bot
==========================================
Bot token           :

Telegram Chat
==========================================
Maintainer chat id  :
```

產生前端與爬蟲各自的 env 檔：

```powershell
.\scripts\setup-local-env.ps1
```

更多說明：

- [本機機密流程](docs/LOCAL_SECRETS.md)
- [Supabase 設定流程](docs/SUPABASE_SETUP.md)
- [Vercel 部署流程](docs/VERCEL_DEPLOY.md)
- [GitHub Actions 自動同步](docs/GITHUB_ACTIONS_SETUP.md)
- [義大三院資料來源研究](docs/EDAH_RESEARCH.md)

## 前端開發

```bash
cd apps/web
npm install
npm run dev
```

`.env.local` 由 `scripts/setup-local-env.ps1` 產生。

## 爬蟲開發

```bash
cd scraper
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py kmugh
```

`.env` 由 `scripts/setup-local-env.ps1` 產生。

## 部署方向

| 元件 | 平台 |
|---|---|
| 前端 | Vercel |
| 爬蟲 | GitHub Actions |
| 資料庫 | Supabase |
| 通知 | Telegram |

GitHub Actions 排程設定於 `.github/workflows/sync-schedules.yml`，預計每週一台灣時間
08:00 自動同步。

## 安全注意事項

- `.env`、`.env.local`、`.local-secrets.txt` 不可 commit。
- `SUPABASE_SECRET_KEY` 只能放在本機 `scraper/.env` 或 GitHub Actions Secrets。
- 前端只能使用 Supabase `Publishable key`。
- Telegram bot token 只能放在本機或 GitHub Actions Secrets。
