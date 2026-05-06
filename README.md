# 醫點通 Med-Link

南台灣醫療通路業務診表整合與即時通報系統原型。此版本採用無建置步驟的靜態 PWA 架構，先完成可驗收的查詢、看板、異動警示與收藏追蹤體驗。

## 已完成內容

- 地區、醫院分院、科別、醫師連動查詢，按「套用查詢」後更新結果
- 醫師姓名、科別、專長與醫院關鍵字搜尋
- 8 間中大型醫院、96 位醫師與多科別資料集範例，排除基層診所
- 月分日曆看板，顯示每日診次總數與異動標示
- 星期快速過濾，顯示跨院所週表
- 診次詳細資訊、診間、醫師專長、代診與導航
- 收藏醫師追蹤，使用 `localStorage` 保存
- 停診、班別調動、代診的紅色/黃色警示
- 模擬 LINE/系統推播按鈕
- PWA manifest 與 service worker 離線快取

## 開啟方式

直接用瀏覽器開啟：

```text
E:\Med-Link-G\index.html
```

若要測試 PWA 安裝與 service worker，請使用 HTTP server 開啟專案根目錄，例如未來在有 Node 或 Python 的環境下執行靜態伺服器。

## 後端接軌方向

前端目前的 `appointments` 結構可對應到 `/api/appointments` 回傳資料。後端建議以 Python ETL 定時同步各院官網，再將標準化資料寫入 PostgreSQL/MySQL，Redis 快取高頻查詢，LINE Messaging API 負責異動推播。

建議排程：

- 08:00：早診前官網資料同步
- 12:00：下午診前異動比對
- 17:00：夜診與隔日拜訪規劃前同步

資料表草案位於 `backend/schema.sql`，ETL 流程骨架位於 `backend/etl_outline.py`。
