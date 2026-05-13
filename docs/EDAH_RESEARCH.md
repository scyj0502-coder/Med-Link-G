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
| `edah-cancer` | 義大癌治療醫院 | `https://edhg.blob.core.windows.net/upload/userfile/Download/51/EDAH.pdf` |
| `edah-dachang` | 義大大昌醫院 | `https://edhg.blob.core.windows.net/upload/userfile/Download/51/EDH_NEW.pdf` |

以上三間應該作為三個不同 hospital source，不要混成一間醫院。

## 2026-05-13 初步檢查

三份檔案皆為 PDF：

| 檔案 | 大小 | Last-Modified |
|---|---:|---|
| `EDAH_NEW.pdf` | 約 4.4 MB | 2026-04-24 |
| `EDAH.pdf` | 約 4.7 MB | 2026-04-24 |
| `EDH_NEW.pdf` | 約 7.8 MB | 2026-04-24 |

使用 `pypdf` 嘗試抽取前兩頁文字，幾乎沒有文字內容，判斷為圖片型 PDF。

## 開發結論

義大 adapter 需要 OCR 或影像表格解析，不能只用 HTML 或一般 PDF 文字抽取。

目前已先在 `scraper/config.yaml` 建立三個 source，但保持：

```yaml
enabled: false
```

等 OCR / 表格解析流程完成後，再逐一啟用。

## 後續實作方向

1. 先選一間醫院做 MVP，建議 `edah-main`。
2. 下載 PDF 到暫存路徑。
3. 將每頁轉成圖片。
4. 以 OCR 擷取科別、醫師、星期、時段與診間。
5. 將低信心結果送入 `rejected_schedules`，不要發布給業務端。
6. 等 `published_schedules` 品質穩定後才打開 `enabled: true`。
