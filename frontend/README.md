# My Cloud Photos — 本機照片／影片原型

React Native + Expo + TypeScript，相簿 UI 以 iPhone Photos 的簡潔排版、深淺色與磨砂玻璃控制列為參考。本專案只使用 `frontend/demo-server/test/` 的測試媒體，**不連接既有 FastAPI、不使用 SQLite、不存取 C:\CloudStorage**。

## 快速開始（Windows PowerShell）

以下指令均在 `C:\Users\2HA\projects\my_cloud\frontend` 執行。預設使用你提供的 `C:\Tools\Node\node-v24.22.1-win-x64`。

### 1. 啟用環境、安裝依賴

```powershell
cd C:\Users\2HA\projects\my_cloud\frontend
. .\scripts\dev-env.ps1
npm.cmd ci
npm.cmd run setup:server
npm.cmd run setup:tools
```

這份交付已安裝依賴與影片工具；在目前電腦可以直接跳到下一步。重新下載專案或依賴損壞時才需重跑安裝。

`dev-env.ps1` 只調整**目前終端的環境變數**，不更動系統 Node、永久 PATH 或登錄檔。npm cache、Expo user state、暫存都指向 frontend 內。每個新 PowerShell 終端都先執行它。

若 Node 放在其他地方：

```powershell
. .\scripts\dev-env.ps1 -NodeDirectory 'C:\你的Node資料夾'
```

若 PowerShell 不允許執行本機腳本，可在該終端使用 `Set-ExecutionPolicy -Scope Process Bypass`；這只影響該終端，不需要變更永久系統政策。

### 2. 加入照片與影片

手動把測試用檔案**複製**到：

```text
C:\Users\2HA\projects\my_cloud\frontend\demo-server\test\
```

- 照片：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`（不分大小寫）。
- 影片：`.mp4`、`.mov`。驗收基準是 H.264 視訊、AAC 音訊；沒有音軌也可播放。
- 只掃描第一層，不掃子目錄，不跟隨捷徑、符號連結、junction 或硬連結。
- 原檔只讀，縮圖／影片封面自動產生在 `demo-server/cache/`。
- 沒放檔案時會顯示空圖庫，這是正常的。

### 3. 找到電腦的區域網路 IP

```powershell
ipconfig
```

找到目前使用的 Wi-Fi／乙太網路介面之 **IPv4 位址**，例如 `192.168.1.100`。不要用手機 IP、VPN IP，或把下面的示範 IP 原封不動貼上。

### 4. 啟動媒體伺服器（終端 A）

```powershell
cd C:\Users\2HA\projects\my_cloud\frontend
. .\scripts\dev-env.ps1
$env:DEMO_HOST = '192.168.1.100' # 改成電腦實際的區域網路 IPv4
$env:DEMO_PORT = '8787'
npm.cmd run demo
```

保留終端開啟。伺服器只會監聽你指定的本機介面；不接受 `0.0.0.0` 或 `::`。省略 `DEMO_HOST` 時只監聽 `127.0.0.1`，適合電腦測試，手機不能連線。

在 iPhone Safari 開啟 `http://192.168.1.100:8787/health`（換成實際 IP），正常會看到：

```json
{ "ok": true, "videoTools": true }
```

若 `videoTools` 為 false，回到 frontend 執行 `npm.cmd run setup:tools`。

### 5. 設定前端並啟動 Expo（終端 B）

第一次先複製設定範本，若已有 `.env` 不要覆寫：

```powershell
cd C:\Users\2HA\projects\my_cloud\frontend
. .\scripts\dev-env.ps1
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

把 `.env` 改為你的電腦 IP，儲存：

```dotenv
EXPO_PUBLIC_MEDIA_BASE_URL=http://192.168.1.100:8787
```

再執行：

```powershell
npm.cmd start
```

**iPhone 與電腦需在能互通的同一區域網路。** iPhone 安裝 Expo Go，使用相機掃描終端 QR code，以 Expo Go 開啟。若詢問區域網路權限，允許 Expo Go 存取。

本專案已升級至 Expo SDK 58，配合你 iPhone 上的 Expo Go SDK 58，相容的 React Native 與原生套件一併更新。若未來 Expo Go 改為另一版 SDK，會顯示版本不符；需對齊 SDK，不是改 API 位址就能解決。升級後先停止舊 Expo 終端，再執行 `npm.cmd start -- --clear` 清除 Metro 快取。可用以下指令檢查套件配對：

```powershell
node.exe node_modules/expo/bin/cli install --check
```

此版本使用 Expo Go 內建原生模組，不要求 macOS 或付費 Apple Developer 帳號。沒有執行 prebuild 或產生 iOS／Android 原生專案。

### 6. 日常操作

- 圖庫預設 3 欄；雙指張開／收攏切換 2／3／5 欄，也可用底部 `−`／`＋`。
- 底部左側切換「全部媒體／只看影片」，不是尚未實作的假分頁。
- 加入、替換或移除測試檔案後，下拉刷新或按右上角重新整理。
- 點照片進入檢視器；雙指縮放、放大後拖曳、雙擊放大／復原。原比例時左右滑動換頁。
- 點一下顯示／隱藏控制列；資訊按鈕開啟檔名、尺寸、大小、格式、拍攝日期等資料。
- 影片點開後靜音播放；可播放／暫停、開啟聲音、拖曳進度。換頁或進入背景會暫停。
- 回圖庫時保留原有清單；刷新失敗時保留已載入清單並顯示重試提示。
- 停止開發：在兩個終端各按 `Ctrl+C`。

### 電腦瀏覽器預覽

伺服器用 `127.0.0.1` 時，可在啟動 Expo 的終端設定：

```powershell
$env:EXPO_PUBLIC_MEDIA_BASE_URL = 'http://127.0.0.1:8787'
npm.cmd run web
```

使用 `localhost` 或 `127.0.0.1` 開啟 Web 預覽。環境變數優先於 `.env`；之後改回 iPhone 測試時，請移除該終端的覆寫：`Remove-Item Env:EXPO_PUBLIC_MEDIA_BASE_URL`，再重啟 Expo。

## 常見問題

| 現象                             | 處理方式                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 手機無法連線                     | 先用 Safari 測 `/health`。檢查電腦 IPv4、DEMO_HOST、Wi-Fi、Expo Go 區域網路權限、Windows 私人網路防火牆。不要關閉整個防火牆；若需要，由你允許 Node 的私人網路連線。 |
| QR code 可以開，但媒體讀不到     | Metro 與媒體伺服器是兩個服務。檢查 8787 及 `.env`；Expo tunnel 不會自動轉發媒體伺服器。                                                                             |
| `.env` 改了仍用舊 IP             | 停止 Expo，再 `npm.cmd start -- --clear`；也檢查終端是否有同名環境變數。                                                                                            |
| 找不到影片或顯示部分檔案無法讀取 | 執行 `npm.cmd run setup:tools`，再刷新；壞檔、不支援或無法解析的檔案會跳過。                                                                                        |
| 影片封面正常，但無法播放         | MP4／MOV 是容器，不保證編碼相容。以 H.264／AAC 的一般 SDR 影片測試；本版不自動轉碼。                                                                                |
| 第一次刷新較久                   | 每次刷新會以串流讀取檔案計算版本，首次另讀 metadata。大量／大型影片會增加時間，先用小批素材。                                                                       |
| 缺少拍攝日期                     | 顯示「無拍攝日期」。排序可用修改時間備援，但不冒充拍攝日期。沒有時區的 EXIF 日期保留當地時間語意。                                                                  |
| 8787 已被占用                    | 關閉之前的 demo server，或指定其他 DEMO_PORT，並同步更新 `.env`。                                                                                                   |

## 架構與修改方式

```text
frontend/
  app/                 Expo Router：圖庫、全螢幕媒體
  components/          格線、照片縮放、影片播放器、詳細資料
  hooks/               主題與欄數策略
  types/               MediaItem / MediaList
  services/            MediaRepository、demo adapter、共享圖庫狀態
  assets/              前端資源
  demo-server/
    src/               獨立 Node ESM HTTP server
    test/              手動加入的唯讀測試媒體
    cache/             JPEG 縮圖與影片封面
    tools/             本機 FFmpeg / FFprobe（不提交）
    tests/             Node 自動測試
  tests/               Repository 映射與網路錯誤測試
  scripts/             PowerShell 環境與工具安裝
```

前端使用嚴格 TypeScript；獨立伺服器採直接可執行的 `.mjs`，不需要另一個編譯步驟。兩邊有獨立的 package 與 lockfile。Metro 排除 demo-server、工具與暫存目錄。

UI 只讀取 `MediaRepository`。未來整合 FastAPI 時新增 `CloudMediaRepository`，在 `MediaRepositoryProvider` 注入即可；本版沒有該實作，也沒有硬編碼後端路徑。

API：

- `GET /health`：伺服器與影片工具狀態。
- `GET /media`：重新掃描，回傳 `{ items, warnings }`。
- `GET /media/:id`：單筆 metadata。
- `GET|HEAD /media/:id/original?v=版本`：原圖／原影片，支援 byte Range 與 ETag。
- `GET|HEAD /media/:id/thumbnail?v=版本`：最長邊 640 的 JPEG 縮圖／封面。

單筆資料含 `kind`、檔名、尺寸、檔案大小、格式、日期、版本及相對媒體 URL；影片另含時長與編碼。ID 由檔名產生，不接受客戶端傳入磁碟路徑。

縮圖依內容 hash、尺寸及處理版本區分；同一項目的並行產生請求共用工作，最多同時處理兩張。快取只在原檔仍存在時提供；舊版本快取目前不自動清除。**本版沒有可寫入／刪除原檔的 API。**

## 驗證

```powershell
. .\scripts\dev-env.ps1
npm.cmd run check
node.exe node_modules/expo/bin/cli install --check
$env:CI = '1'
node.exe node_modules/expo/bin/cli export --platform ios --platform web --output-dir dist
```

測試資料只產生於 `frontend/.tmp/tests/`，不使用或修改手動加入的 `demo-server/test/` 檔案。Windows junction 測試需要允許本機建立測試 junction；若環境禁用，應標記環境限制，不應誤認已驗證。

已執行的驗證：TypeScript、repository／清單／刷新／空目錄／壞檔／快取／路徑防護／HTTP Range／H.264 影片封面與原檔完整性測試；iOS 與 Web bundle 匯出；瀏覽器基本圖庫、影片、詳細資料與欄數切換檢查。測試影片是自動產生的測試圖樣，並非你的媒體。

### iPhone 手動驗收（尚未執行，請勿當作已通過）

- [ ] Expo Go 能開啟，Safari 可讀取 `/health`。
- [ ] 深／淺色背景、34pt 大標題、模糊控制列與安全區沒有遮住內容。
- [ ] 圖庫 2／3／5 欄切換、雙指手勢、捲動位置與大量素材效能。
- [ ] 照片縮放、平移、雙擊復原與換頁不衝突。
- [ ] JPEG／PNG／WebP／動畫 GIF 顯示與旋轉方向。
- [ ] 橫向／直向 MP4、MOV 播放、音訊、拖曳進度與播放結束。
- [ ] 切換照片／影片、回圖庫或進背景後，舊影片不再播放。
- [ ] 字體放大、VoiceOver、減少動態效果與手機旋轉。
- [ ] 斷線後重試；新增／修改／移除素材後刷新；原檔保持不變。

## 第一版限制

- 不含上傳、下載按鈕、刪除、Face ID、帳號、雲端同步、影片編輯、回憶或 AI 分類。
- HEIC／HEIF、Live Photos、RAW、HDR 色彩一致性及任意影片編碼不在驗收範圍。
- 格線採門檻式欄數切換，非完整重製 Apple Photos 的連續重排動畫；介面是參考風格，並非 Apple 原生 Photos 元件。
- 預覽圖片使用 expo-image 快取；影片依原生播放器串流，不承諾整部影片離線快取。
- Android／Web 保留可移植架構，但未完成與 iPhone 相同的手勢與裝置驗收。
- demo server 是私人開發網路用的無登入服務，不應公開到網際網路。
