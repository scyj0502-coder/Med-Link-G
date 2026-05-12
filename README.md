# 醫點通 (Med-Link)

南台灣醫療通路業務診表整合平台。正式版方向是：Python 爬蟲定時抓取醫院門診資料，通過資料品質門檻後寫入 Supabase，Next.js PWA 只顯示已發布資料，Telegram 只推播已確認異動。

## 目前定位

此 repo 目前同時保留兩層：

- `index.html` / `app.js`：GitHub Pages 原型，用來驗證 UX 與岡山醫院資料呈現。
- `apps/web` / `scraper` / `db`：正式版骨架，接下來的主線。

業務端不應看到 OCR、人工驗證或資料維護工作。資料不夠可信時，系統應擋下並寫入內部報告，而不是交給業務處理。

## 正式技術棧

| 層 | 選型 |
|---|---|
| 前端 | Next.js 15 App Router + TypeScript + Tailwind |
| API | Next.js Route Handlers / Supabase client |
| 爬蟲 | Python 3.11 + httpx + BeautifulSoup |
| 排程 | GitHub Actions cron |
| DB | Supabase PostgreSQL |
| 推播 | Telegram Bot API |

## 專案結構

```text
apps/web/              Next.js PWA
scraper/               Python 爬蟲與資料發布流程
db/migrations/         Supabase SQL schema
.github/workflows/     GitHub Actions 排程
backend/               既有原型爬蟲與資料轉換工具
data/                  既有原型 JSON 資料
```

## 第一個正式里程碑

先只做一條完整線：

1. 高醫岡山醫院資料來源。
2. Python adapter 產生標準診次。
3. quality gate 擋下低信心或欄位缺漏資料。
4. published schedules 寫入 Supabase。
5. Next.js 首頁只讀 published schedules。
6. Telegram 發送已確認異動或資料品質告警。

## 前端開發

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

`.env.local` 僅可放 Supabase publishable / anon key。

## 爬蟲開發

```bash
cd scraper
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python main.py kmugh
```

`.env` 會包含 Supabase service role key 與 Telegram token，絕對不可 commit。

## 部署

| 元件 | 平台 |
|---|---|
| 前端 | Vercel |
| 爬蟲 | GitHub Actions |
| 資料庫 | Supabase |
| 推播 | Telegram |

GitHub Actions 排程位於 `.github/workflows/sync-schedules.yml`，目前設定為台灣時間 08:00、12:00、17:00 對應的 UTC cron。

## 安全注意事項

- `.env`、`.env.local`、`.local-secrets.txt` 不可 commit。
- Supabase service role key 只能放本機 `.env` 或 GitHub Actions Secrets。
- 前端只能使用 Supabase anon key，並依靠 RLS policy 限制存取。
- Telegram bot token 只能放本機 `.env` 或 GitHub Actions Secrets。
