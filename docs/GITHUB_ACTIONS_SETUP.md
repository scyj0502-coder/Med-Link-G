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

若 `changes` 大於 0，代表系統偵測到新增、刪除或異動。

`preserve_stale=True` 代表這次解析結果比上一版少太多，系統先保留上一版未出現在本次結果中的資料，避免一次 OCR 或來源異常造成前台資料突然消失。

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
