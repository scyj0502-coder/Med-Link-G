# Backend Outline

此資料夾提供後端資料同步與資料庫設計草案，供下一階段接上正式 API。

## 建議服務

- `scraper`: 依醫院來源擷取診表 HTML/API
- `normalizer`: 將各院格式統一為標準診次資料
- `change_detector`: 與上一版資料比對，產生停診、代診、班別調動事件
- `notifier`: 對收藏醫師/醫院推送 LINE Messaging API 訊息
- `api`: 提供前端查詢篩選、月曆統計與收藏資料

## API 草案

- `GET /api/hospitals?region=台南`
- `GET /api/doctors?hospitalId=ncku&department=心臟內科`
- `GET /api/appointments?from=2026-05-01&to=2026-05-31&doctor=林哲宇`
- `POST /api/favorites`
- `GET /api/changes?status=cancelled`
- `POST /api/line/webhook`

正式開發時可用 FastAPI 作為 API 層，Scrapy 或 Playwright 作為資料擷取層。
