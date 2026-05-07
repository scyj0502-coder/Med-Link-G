# Backend Outline

此資料夾提供後端資料同步與資料庫設計草案，供下一階段接上正式 API。

## 建議服務

- `scraper`: 依醫院來源擷取診表 HTML/API
- `normalizer`: 將各院格式統一為標準診次資料
- `change_detector`: 與上一版資料比對，產生停診、代診、班別調動事件
- `notifier`: 對收藏醫師/醫院推送 Telegram Bot API 訊息
- `api`: 提供前端查詢篩選、月曆統計與收藏資料

## API 草案

- `GET /api/hospitals?region=台南`
- `GET /api/doctors?hospitalId=ncku&department=心臟內科`
- `GET /api/appointments?from=2026-05-01&to=2026-05-31&doctor=林哲宇`
- `POST /api/favorites`
- `GET /api/changes?status=cancelled`
- `POST /api/telegram/webhook`

## Telegram 推播草案

1. 建立 Telegram Bot，取得 `BOT_TOKEN`。
2. 使用者對 Bot 發送 `/start`，後端 webhook 取得 `chat_id`。
3. 後端將 `user_id` 與 `chat_id` 存入 `telegram_subscriptions`。
4. ETL 偵測停診、代診、班別異動後，查詢收藏該醫師或醫院的使用者。
5. 透過 `https://api.telegram.org/bot{BOT_TOKEN}/sendMessage` 發送通知。

通知範例：

```text
[醫點通] 高醫 胸腔內科 蔡忠榮 2026-05-08 上午診臨時停診，請調整拜訪行程。
```

正式開發時可用 FastAPI 作為 API 層，Scrapy 或 Playwright 作為資料擷取層。

## 高醫同步腳本

```powershell
python -m pip install -r backend\requirements.txt
python backend\sources\kmuh_sync.py --output data\kmuh.json
```

腳本會下載高醫官方門診 PDF，解析各科門診表頁面的文字座標，輸出：

- `source`: 來源、同步時間、解析器版本
- `departments`: 科別清單
- `doctors`: 醫師清單
- `sessions`: 每週診次樣板
- `stats`: 診別、科別、醫師、診次數量

目前 PDF 表格中的特殊備註已保留在來源欄位，完整停代診比對會在下一階段處理。

## 資料來源清單

先用 CSV 模擬 Google Sheet：

```powershell
python backend\sources\source_registry.py --input data\sources.sample.csv
```

產生前端讀取用 JSON：

```powershell
python backend\sources\source_registry.py --input data\sources.sample.csv --output data\source-registry.json
```

檢查來源是否可解析，並產生同步診斷：

```powershell
python backend\sources\source_sync.py --input data\sources.sample.csv --output data\source-sync-status.json
```

CSV 欄位：

```text
區域,醫院簡稱,醫院全名,分院名稱,科別,來源類型,門診連結位置,狀態,備註
```

未來改接 Google Sheets API 時，維持相同欄位即可。
