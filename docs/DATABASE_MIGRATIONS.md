# Supabase 資料庫更新

此專案的資料表變更放在：

```text
db/migrations/
```

如果沒有使用 Supabase CLI，請到 Supabase 後台手動執行 SQL。

## 手動執行方式

1. 開啟 Supabase 專案。
2. 左側選單進入 `SQL Editor`。
3. 新增 query。
4. 貼上尚未執行過的 migration SQL。
5. 按 `Run`。
6. 到 `Table Editor` 確認資料表已建立。

## 目前 migration

| 檔案 | 用途 |
|---|---|
| `0001_initial.sql` | 基礎醫院、同步紀錄與門診資料表 |
| `0002_data_api_grants.sql` | Data API 權限 |
| `0003_schedule_parse_metadata.sql` | 門診解析狀態欄位 |
| `0004_source_tracking_metadata.sql` | 來源追蹤欄位 |
| `0005_personal_notes.sql` | 個人醫師備註 |
| `0006_personal_favorites.sql` | 個人收藏醫師 |
| `0007_public_sync_run_status.sql` | 資料來源頁讀取最新同步狀態 |

## 這次需要補跑

如果 Supabase 尚未讓前端讀取最新同步狀態，請執行：

```text
db/migrations/0007_public_sync_run_status.sql
```

執行後應看到：

- `sync_runs.error_message` 欄位
- `sync_runs` 可用 publishable key 讀取同步狀態
- 資料來源頁可顯示「最近同步」、「更新異常」與錯誤摘要

## 注意

`personal_notes` 與 `personal_favorites` 都需要 Supabase Auth 登入後才會寫入遠端資料。未登入時，網站仍會使用本機 localStorage 作為備援。

## 同步安全機制

爬蟲同步時，正式門診資料不會在明顯異常的情況下被大量刪除。

目前規則：

- 如果某醫院上一版已有 20 筆以上正式資料。
- 而這次可發布資料少於上一版 50%。
- 系統會先保留上一版未出現在本次結果中的資料。
- 同時不發送大量「門診已移除」通知。

這代表 PDF/OCR 或醫院網頁暫時解析不完整時，前台仍可保留上一版可用資料，不會因一次同步異常造成整間醫院資料突然消失。

資料來源頁會另外讀取 `sync_runs`：

- 最近一次同步成功，才顯示正常。
- 最近一次同步部分失敗，顯示部分異常。
- 最近一次同步完全失敗，顯示更新異常。
- 即使顯示更新異常，正式查詢仍會保留上一版已發布資料，避免業務端突然看不到資料。
