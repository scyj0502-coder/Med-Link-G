# Vercel 部署流程

正式 Next.js 前端建議部署到 Vercel。GitHub Pages 仍可保留作為舊版靜態原型，
但正式版會從 Supabase 即時讀取 `published_schedules`。

## 1. 匯入 GitHub 專案

1. 打開 Vercel。
2. 選擇 `Add New... -> Project`。
3. 從 GitHub 匯入：

```text
scyj0502-coder/Med-Link-G
```

## 2. 設定專案目錄

因為 Next.js 前端放在 `apps/web`，Vercel 設定請填：

```text
Framework Preset : Next.js
Root Directory   : apps/web
Build Command    : npm run build
Output Directory : .next
Install Command  : npm install
```

通常 Vercel 會自動偵測 Next.js，只要確認 `Root Directory` 是 `apps/web`。

## 3. 設定環境變數

進入 Vercel 專案設定：

```text
Settings -> Environment Variables
```

只加入前端需要的兩個值：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

值可以從本機這個檔案對照：

```text
apps/web/.env.local
```

注意：

- 不要把 `SUPABASE_SECRET_KEY` 放到 Vercel 前端專案。
- `SUPABASE_SECRET_KEY` 只給爬蟲或 GitHub Actions 使用。
- Vercel 前端只需要 Publishable key。

## 4. 部署後確認

部署完成後打開 Vercel 給的網址，確認畫面有：

- `Supabase 已連線`
- `已發布診次 33`
- 可搜尋醫師，例如 `郭炫孚`
- 可依科別與星期篩選

如果部署後畫面沒有資料，通常是環境變數沒有填、填錯，或沒有重新 Deploy。

## 5. 之後才設定 GitHub Actions

Vercel 只負責前端。  
每日 08:00、12:00、17:00 的自動爬蟲同步，之後會由 GitHub Actions 負責。

到那一步才需要設定：

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_MAINTAINER_CHAT_ID
```
