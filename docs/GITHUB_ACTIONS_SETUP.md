# GitHub Actions 自動同步設定

本專案的爬蟲排程放在：

```text
.github/workflows/sync-schedules.yml
```

目前設定會在台灣時間自動同步：

```text
每週一 08:00
```

也可以在 GitHub 頁面手動執行單一醫院，例如 `kmugh`。

## 1. 設定 Repository Secrets

打開 GitHub 專案：

```text
https://github.com/scyj0502-coder/Med-Link-G
```

進入：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

目前至少要新增：

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
```

值可以從本機這個檔案對照：

```text
scraper/.env
```

注意：

- `SUPABASE_SECRET_KEY` 不要貼到聊天裡。
- `SUPABASE_SECRET_KEY` 只能放在 GitHub Actions Secrets 與本機 `scraper/.env`。
- Vercel 前端不需要也不應該放 `SUPABASE_SECRET_KEY`。

Telegram 尚未正式設定前，這兩個可以先不填：

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_MAINTAINER_CHAT_ID
```

## 2. 手動執行同步

到 GitHub 專案：

```text
Actions -> Sync schedules -> Run workflow
```

`target` 可以留空，代表跑全部已啟用醫院。

如果只想跑高醫岡山，填：

```text
kmugh
```

## 3. 檢查結果

執行完成後，log 應該會看到類似：

```text
kmugh: scraped=33 published=33 rejected=0 changes=0
```

若 `changes` 大於 0，代表系統偵測到新增、刪除或異動。

## 4. 義大三院後續

義大來源頁有三間醫院：

- 義大醫院
- 義大癌治療醫院
- 義大大昌醫院

目前先把它們視為三個不同 hospital source。  
因為下載檔是圖片型 PDF，後續需要 OCR / 影像表格解析完成後才會啟用排程。
