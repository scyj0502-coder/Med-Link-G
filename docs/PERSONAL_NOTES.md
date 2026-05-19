# 個人備註資料表規劃

目前前端的醫師備註先使用瀏覽器 localStorage 暫存，方便開發與測試。
正式登入功能完成後，備註應改存到 Supabase 的 `personal_notes` 資料表。

## 資料表

Migration 檔案：

```text
db/migrations/0005_personal_notes.sql
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

## 權限

`personal_notes` 已啟用 RLS。

規則：

- 登入使用者只能讀取自己的備註。
- 登入使用者只能新增自己的備註。
- 登入使用者只能修改自己的備註。
- 登入使用者只能刪除自己的備註。
- `service_role` 保留完整權限，僅供後端或維護腳本使用。

## 前端串接方向

目前：

```text
apps/web/app/ClientDashboard.tsx
```

備註仍存在：

```text
localStorage key: medlink:personal-notes:v1
```

未來登入完成後，建議改成：

1. 進入頁面時，用目前登入者的 `auth.uid()` 讀取 `personal_notes`。
2. 儲存備註時，用 `upsert` 寫入 `user_id + doctor_key`。
3. localStorage 僅保留成離線草稿或備援，不再當正式資料來源。
