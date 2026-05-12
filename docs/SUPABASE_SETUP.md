# Supabase 設定流程

這份文件是給你建立醫點通 Supabase 專案時照著操作用的。

## 1. 建立 Supabase 專案

1. 打開 Supabase 網站並登入。
2. 點選建立新專案。
3. 建議填寫：

```text
Project name : med-link
Region       : Tokyo / Northeast Asia，若畫面有這個選項就選它
```

建立專案時，Supabase 會要求你設定資料庫密碼。

這個密碼先自己保存，例如密碼管理器、筆記本或你習慣的安全方式。
目前程式還沒有用到它，所以先不要寫進 `.local-secrets.txt`，也不要貼到聊天裡。

## 2. 取得目前需要的三個 Supabase 資訊

專案建立完成後，進入：

```text
Project Settings -> API Keys
```

你只需要把下面三個值填進 `.local-secrets.txt`：

```text
Supabase
==========================================
Project URL         :
Publishable key     :
Secret key          :
```

填寫方式：

| 欄位 | 要貼什麼 |
|---|---|
| `Project URL` | Supabase 專案網址，通常長得像 `https://xxxx.supabase.co` |
| `Publishable key` | 給前端用的公開 key，通常長得像 `sb_publishable_...` |
| `Secret key` | 給爬蟲 / 後端用的 secret key，通常長得像 `sb_secret_...` |

注意：`Secret key` 不要貼到聊天裡，也不要放到前端。

## 3. 產生本機環境檔

填好 `.local-secrets.txt` 後，在專案根目錄執行：

```powershell
.\scripts\setup-local-env.ps1
```

它會自動產生：

```text
apps/web/.env.local
scraper/.env
```

這兩個檔案也都不能 commit。

## 4. 建立資料庫表格

在 Supabase 後台進入：

```text
SQL Editor -> New query
```

然後打開本專案這個檔案：

```text
db/migrations/0001_initial.sql
```

把內容整段貼到 Supabase SQL Editor，按下 Run。

這會建立目前系統需要的資料表：

- `hospitals`：醫院資料
- `sync_runs`：每次同步紀錄
- `published_schedules`：已發布、業務可以看到的門診資料
- `rejected_schedules`：系統內部判定不可信的資料
- `schedule_changes`：門診異動紀錄

業務網站只會讀取「啟用醫院」與「已發布門診資料」。
爬蟲寫入資料時才會使用 `Secret key`。

如果你是在 `0001_initial.sql` 尚未包含 Data API 權限時就已經建立資料表，
請再執行一次：

```text
db/migrations/0002_data_api_grants.sql
```

新建立的 Supabase 專案只需要跑最新版 `0001_initial.sql` 即可。

## 5. GitHub Actions Secrets 之後再設定

等本機確認可以連到 Supabase 後，之後才需要到 GitHub repository 設定 Secrets。

目前預計會需要：

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_MAINTAINER_CHAT_ID
```

這一步不用急，先讓本機 Supabase 連線成功比較重要。
