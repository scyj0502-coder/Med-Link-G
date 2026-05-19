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

## 這次需要補跑

如果 Supabase 尚未有 `personal_favorites` 資料表，請執行：

```text
db/migrations/0006_personal_favorites.sql
```

執行後應看到：

- `personal_favorites` 資料表
- RLS 已啟用
- authenticated 使用者只能讀寫自己的收藏
- `user_id + doctor_key` 為主鍵

## 注意

`personal_notes` 與 `personal_favorites` 都需要 Supabase Auth 登入後才會寫入遠端資料。未登入時，網站仍會使用本機 localStorage 作為備援。
