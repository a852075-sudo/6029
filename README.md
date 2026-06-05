# 東京進香團旅遊地圖

這是一個本地預覽用的旅遊查詢網站，資料整理自你提供的 Word 檔與地圖截圖檔名。

## 開啟方式

1. 在 PowerShell 進入此資料夾：
   `C:\Users\a8520\Documents\Codex\2026-06-04\files-mentioned-by-the-user-docx\outputs\tokyo-travel-map-site`
2. 執行：
   `.\start-preview.ps1`
3. 用瀏覽器開啟：
   `http://127.0.0.1:5173`

## 功能

- 最上方日期/區域按鈕可切換每日行程。
- 地圖會要求定位權限，允許後顯示目前位置。
- 地圖標註當日周邊想去的景點。
- 側邊欄提供搜尋、類別篩選、當日停靠點與 Google Maps 路線。
- 下方景點卡片提供資訊、地圖定位與 Google 導航。

## 備註

目前可直接本地預覽。若之後要完整改成 Google Maps JavaScript 原生地圖，需要準備 Google Maps API key；現版已提供 Google Maps 導航連結。
