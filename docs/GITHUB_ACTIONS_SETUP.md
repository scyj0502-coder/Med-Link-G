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

同步流程會先跑 parser 單元測試，測試通過後才會寫入 Supabase。

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

`target` 會以下拉選單呈現。選 `all` 代表跑全部已啟用醫院。

如果只想跑高醫岡山，填：

```text
kmugh
```

常用選項：

```text
all              全部已啟用來源
kmugh            高醫岡山
edah_pdf         義大三院
edah-main        義大醫院
edah-cancer      義大癌治療醫院
edah-dachang     義大大昌醫院
shinkao          新高醫院
pingtung-mohw    衛生福利部屏東醫院
cgmh-datong      高雄市立大同醫院
ptvgh            屏東榮民總醫院
```

如果選到不存在或未啟用的來源，排程會直接失敗並在同步摘要中顯示錯誤，避免「看起來成功但其實沒有同步」。

## 3. 檢查結果

執行完成後，log 應該會看到類似：

```text
kmugh: scraped=33 published=33 rejected=0 changes=0 preserve_stale=False
```

GitHub Actions 的 Summary 會另外顯示「來源同步總表」，用表格列出每個來源的狀態、抓取筆數、發布筆數、異常筆數、異動筆數，以及是否保留上一版資料。這一段比完整 log 更適合快速檢查同步結果。

若有資料被品質規則擋下，Summary 也會列出主要原因，例如：

```text
low_confidence 2 筆、missing_department 1 筆
```

這代表系統沒有把不可信資料發布給業務查詢，並不是要業務逐筆人工驗證。

同一次執行也會上傳 `med-link-sync-report` artifact，裡面包含：

- `sync-summary.json`
- `sync-summary.md`
- `sync-output.log`

如果需要回頭追查某次同步細節，可以從該次 Actions run 的 Artifacts 下載。

若 `changes` 大於 0，代表系統偵測到新增、刪除或異動。

`preserve_stale=True` 代表這次解析結果比上一版少太多，系統先保留上一版未出現在本次結果中的資料，避免一次 OCR 或來源異常造成前台資料突然消失。

若某個來源同步失敗，系統會寫入一筆 `sync_runs` 失敗紀錄。前台「資料來源」頁會顯示為「更新異常」，但正式門診查詢仍保留上一版可用資料，避免業務端突然沒有資料可查。

如果任何來源完全解析失敗，GitHub Actions 會在所有來源都嘗試同步並產生 Summary 後標示失敗。這是提醒維運者檢查來源，不會代表前台資料被清空。

若已設定 Telegram：

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_MAINTAINER_CHAT_ID
```

解析失敗時會主動發送維運通知。這個通知是給管理者看的，不需要業務人員手動驗證資料。

## 4. 已啟用來源狀態

目前已啟用的主要來源包含：

- 高醫岡山
- 義大醫院
- 義大癌治療醫院
- 義大大昌醫院
- 新高醫院
- 衛生福利部屏東醫院
- 高雄市立大同醫院
- 屏東榮民總醫院

目前暫停的來源：

- 高雄長庚紀念醫院：資料來源待確認。
- 安泰醫院：已能探索最新門診圖片，但尚未發布 OCR 結果到正式資料。
