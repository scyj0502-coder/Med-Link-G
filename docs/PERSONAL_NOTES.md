# 個人備註資料表規劃

目前前端的個人備註與收藏已採用「本機快取 + Supabase 遠端同步」的資料層。

- 未登入或沒有 Supabase session 時：使用瀏覽器 localStorage，方便開發與測試。
- 已登入時：讀寫 Supabase 個人資料表，並保留 localStorage 作為快速載入與離線備援。

## 資料表

備註 Migration 檔案：

```text
db/migrations/0005_personal_notes.sql
```

收藏 Migration 檔案：

```text
db/migrations/0006_personal_favorites.sql
```

資料表重點：

| 欄位 | 用途 |
|---|---|
| `user_id` | Supabase Auth 使用者 ID |
| `doctor_key` | 醫師識別鍵，對應前端 `doctorKey` |
| `content` | 個人備註內容 |
| `visit_status` | 拜訪狀態 |
| `last_visit_date` | 上次拜訪日期 |
| `next_reminder` | 下次提醒文字 |
| `reminder_at` | 未來可用於提醒排序或推播 |
| `tags` | 重點醫師、需追蹤、熟客等標籤 |

`user_id + doctor_key` 是主鍵，代表同一位使用者對同一位醫師只會有一份備註。

收藏資料表 `personal_favorites` 也使用 `user_id + doctor_key` 作為主鍵，代表同一位使用者對同一位醫師只會收藏一次。

## 權限

`personal_notes` 與 `personal_favorites` 已啟用 RLS。

規則：

- 登入使用者只能讀取自己的備註與收藏。
- 登入使用者只能新增自己的備註與收藏。
- 登入使用者只能修改自己的備註。
- 登入使用者只能刪除自己的備註與收藏。
- `service_role` 保留完整權限，僅供後端或維護腳本使用。

## 前端串接狀態

目前主要串接位置：

```text
apps/web/app/ClientDashboard.tsx
apps/web/lib/personalNotesStorage.ts
apps/web/lib/favoritesStorage.ts
```

目前流程：

1. 頁面先載入 localStorage，避免畫面空白。
2. 若 Supabase Auth 有登入 session，再讀取 `personal_notes` 與 `personal_favorites`。
3. 遠端資料會和本機資料合併，同一位醫師的遠端備註會覆蓋本機草稿。
4. 儲存備註或切換收藏時，先寫入 localStorage，再嘗試同步到 Supabase。
5. 若遠端寫入失敗，本機資料仍保留，下次儲存可再同步。

本機備援 key：

```text
localStorage key: medlink:personal-notes:v1
localStorage key: medlink:favorites:v3
```

## 後續待補

帳號設定頁已提供 Email magic link 登入入口。下一步需要在 Supabase Auth 確認正式網域 redirect URL，讓部署後的登入信可以正確回到網站。
