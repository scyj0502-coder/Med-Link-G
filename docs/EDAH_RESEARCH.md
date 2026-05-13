# 義大三院資料來源研究

來源頁：

```text
https://www.edah.org.tw/ProcessDetail2/51/Download
```

頁面名稱為「義大醫院-門診表」，但實際上包含義大體系三間醫院。

## 三個來源檔

| hospital id | 醫院 | 目前下載檔 |
|---|---|---|
| `edah-main` | 義大醫院 | `https://edhg.blob.core.windows.net/upload/userfile/Download/51/EDAH_NEW.pdf` |
| `edah-cancer` | 義大癌治療醫院 | `https://edhg.blob.core.windows.net/upload/userfile/Download/51/EDCH_NEW.pdf` |
| `edah-dachang` | 義大大昌醫院 | `https://edhg.blob.core.windows.net/upload/userfile/Download/51/EDDH_NEW.pdf` |

以上三間應該作為三個不同 hospital source，不要混成一間醫院。

若後續來源頁或 PDF 出現澎湖相關院區或診表，先排除不納入醫點通。醫點通目前服務範圍只涵蓋台南、高雄、屏東。

## 2026-05-13 初步檢查

三份檔案皆為 PDF：

| 檔案 | 大小 | Last-Modified |
|---|---:|---|
| `EDAH_NEW.pdf` | 約 4.4 MB | 2026-04-24 |
| `EDCH_NEW.pdf` | 圖片型 PDF | 從義大癌治療醫院分頁取得 |
| `EDDH_NEW.pdf` | 圖片型 PDF | 從義大大昌醫院分頁取得 |

使用 `pypdf` 嘗試抽取前兩頁文字，幾乎沒有文字內容，判斷為圖片型 PDF。

## 開發結論

義大 adapter 需要 OCR 或影像表格解析，不能只用 HTML 或一般 PDF 文字抽取。

目前已先在 `scraper/config.yaml` 建立三個 source，但保持：

```yaml
enabled: false
```

等 OCR / 表格解析流程完成後，再逐一啟用。

## 2026-05-13 OCR 分院辨識

已新增 `scraper/inspect_edah_pdf.py`，可用來檢查 PDF 是否為圖片型、每頁偵測到哪一間分院，以及該頁是否像正式門診時間表。

```bash
cd scraper
python inspect_edah_pdf.py edah-dachang --pages 16
```

初步確認：

| PDF | 門診頁觀察 |
|---|---|
| `EDAH_NEW.pdf` | 主要包含義大醫院門診頁，後段有澎湖駐診與特約門診資訊，澎湖需排除。 |
| `EDCH_NEW.pdf` | 義大癌治療醫院 2026 年 05 月門診表。 |
| `EDDH_NEW.pdf` | 義大大昌醫院 2026 年 05 月門診表。 |
| `EDH_NEW.pdf` | 義大醫療各院區門診表，屬於跨院區彙整檔，不作為單一分院主要來源。 |

分院辨識策略：

- 只用每頁上方標題區判斷分院，避免頁尾電話、交通、共用資訊造成誤判。
- 門診正式資料只接受 `is_schedule_page = true` 的頁面。
- 已加入義大 PDF 常見 OCR 誤讀，例如癌治療醫院可能被辨成「痰治／癭治／療醫院」，大昌醫院可能被辨成「義大大...院」。
- 尚未正式發布義大資料到 `published_schedules`，下一步才是做表格座標解析與醫師診次抽取。

## 2026-05-13 診次抽取保護規則

已新增第一版表格座標切割解析，會用 PDF 左側科別欄、上/下/夜診列、星期一到星期六欄位切出診次候選。

醫師姓名不只依賴 OCR：

1. 先從 PDF 儲存格擷取「醫師姓名 + 醫師代碼」。
2. 用醫師代碼連到義大官方網路掛號頁，例如 `13528` 會查 `https://webreg.edah.org.tw/Register/ChooseDoctorTime/3528`。
3. 若官方頁姓名與 OCR 姓名至少有 2 個中文字重疊，才採用官方姓名並提升信心分數。
4. 若醫師代碼 OCR 錯誤，或官方姓名與 OCR 姓名不合理，該筆會維持低信心，進入 rejected，不發布到業務端。

本機測試結果：

- `edah-dachang` 可抽出候選 31 筆，其中 20 筆通過官方醫師頁校正。
- `edah-main` 可抽出候選 7 筆，其中 5 筆通過官方醫師頁校正。
- `edah-cancer` 目前尚未抽到可發布診次，需再調整頁面/科別區塊。

## 後續實作方向

1. 先選一間醫院做 MVP，建議 `edah-main`。
2. 下載 PDF 到暫存路徑。
3. 將每頁轉成圖片。
4. 以 OCR 擷取科別、醫師、星期、時段與診間。
5. 將低信心結果送入 `rejected_schedules`，不要發布給業務端。
6. 等 `published_schedules` 品質穩定後才打開 `enabled: true`。
