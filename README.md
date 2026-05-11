# 醫點通 Med-Link

南台灣醫療通路業務診表整合與即時通報系統原型。此版本採用無建置步驟的靜態 PWA 架構，先完成可驗收的查詢、看板、異動警示與收藏追蹤體驗。

## 已完成內容

- 地區、醫院分院、科別、醫師連動查詢，按「套用查詢」後更新結果
- 醫師姓名、科別、專長與醫院關鍵字搜尋
- 8 間中大型醫院、120+ 位醫師與多科別資料集範例，高醫資料已依官方門診表擴充，排除基層診所
- 月分日曆看板，顯示每日診次總數與異動標示
- 星期快速過濾，顯示跨院所週表
- 診次詳細資訊、診間、醫師專長、代診與導航
- 收藏醫師追蹤，使用 `localStorage` 保存
- 停診、班別調動、代診的紅色/黃色警示
- 模擬 Telegram/系統推播按鈕
- PWA manifest 與 service worker 離線快取

## 開啟方式

直接用瀏覽器開啟：

```text
E:\Med-Link-G\index.html
```

若要測試 PWA 安裝與 service worker，請使用 HTTP server 開啟專案根目錄，例如未來在有 Node 或 Python 的環境下執行靜態伺服器。

## 後端接軌方向

前端目前的 `appointments` 結構可對應到 `/api/appointments` 回傳資料。後端建議以 Python ETL 定時同步各院官網，再將標準化資料寫入 PostgreSQL/MySQL，Redis 快取高頻查詢，Telegram Bot API 負責異動推播。

建議排程：

- 08:00：早診前官網資料同步
- 12:00：下午診前異動比對
- 17:00：夜診與隔日拜訪規劃前同步

資料表草案位於 `backend/schema.sql`，ETL 流程骨架位於 `backend/etl_outline.py`。

## 高醫資料同步

目前高醫已改為讀取 `data/kmuh.json`。更新方式：

```powershell
python -m pip install -r backend\requirements.txt
python backend\sources\kmuh_sync.py --output data\kmuh.json
```

同步來源：

- 高醫門診表頁面：`https://www.kmuh.org.tw/KMUHInterWeb/InterWeb/InnerPage/1001124048`
- 高醫門診 PDF：`https://www.kmuh.org.tw/include/lib/images/opd.pdf`

產生 JSON 後提交並推送：

```powershell
git add data\kmuh.json
git commit -m "Update KMUH schedule data"
git push origin main
```

GitHub Pages 重新部署後，前端會自動讀取新版高醫資料。

## 資料來源清單

Google Sheet 建議欄位：

```text
區域 | 醫院簡稱 | 醫院全名 | 分院名稱 | 科別 | 來源類型 | 門診連結位置 | 狀態 | 備註
```

目前先用 `data/sources.sample.csv` 模擬 Google Sheet。檢查方式：

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

岡山圖片型 PDF OCR 與指定科別診表輸出：

```powershell
python backend\sources\okayama_ocr.py --input data\sources.sample.csv --output data\okayama-ocr.json
python backend\sources\okayama_schedule.py --output data\okayama.json
```

## 資料可信度驗證

前端提供 `資料驗證` 工作台，可針對目前篩選條件下的每週診次樣板標記：

- `OCR待確認`
- `已人工確認`
- `有疑問`

校正狀態與備註目前先存在瀏覽器 `localStorage`，可用 `匯出校正 JSON` 下載，後續再轉成正式人工校正版資料來源。

匯出的校正 JSON 可轉成前端自動載入的基準資料：

```powershell
python backend\sources\validation_baseline.py --input "C:\Users\ac778\Downloads\med-link-validation-2026-05-11 (1).json" --output data\validation-baseline.json
```

規則：

- `狀態 = 啟用`：系統會讀取
- `狀態 = 停用` 或空白：系統跳過
- `科別` 可用逗號分隔多個科別，例如 `心臟血管內科,肝膽內科`
- `來源類型` 目前可先填 `PDF`，之後可擴充 `HTML`、`API` 或 `Google Sheet`
