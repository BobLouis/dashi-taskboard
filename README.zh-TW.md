[繁體中文](README.md)

# Codex Taskboard

採本機優先設計的任務看板，可在瀏覽器中執行，也可透過獨立 CDP 啟動器或其注入腳本嵌入 Codex。同一套 HTTP API 為 React UI 和隨附 Codex Skill 使用的 `taskctl` CLI 提供支援。

![Codex Taskboard 產品截圖](docs/assets/codex-taskboard.png)

## 系統需求

- Node.js 22.5 或更新版本
- 建置 macOS App 和 DMG：Xcode Command Line Tools、Rust 1.88 或更新版本，以及 `aarch64-apple-darwin` 和 `x86_64-apple-darwin` target。`npm install` 會安裝本專案使用的 Tauri CLI。
- 建置 Windows NSIS：Microsoft Store 版 Codex App、Rust 1.88 或更新版本，以及帶 C++ 工作負載和 Windows SDK 的 Visual Studio Build Tools。

## 本機執行

```bash
npm install
npm run build
npm start
```

開啟 <http://127.0.0.1:47823>。SQLite 資料庫儲存在 `.data/taskboard.sqlite`。

如需在前端即時重載模式下開發：

```bash
npm run dev
```

Vite UI 執行在 <http://127.0.0.1:5173>，並將 API 請求代理到本機服務。

## 使用 CLI

在專案中執行：

```bash
npm run taskctl -- project create \
  --id my-project \
  --name "My project" \
  --workspace-path /absolute/path/to/repository

npm run taskctl -- issue create \
  --project my-project \
  --title "Implement the next slice" \
  --status todo \
  --priority high \
  --labels product,mvp
```

請執行 `npm link`，以便在 shell 路徑中使用 `taskctl`。設定 `CODEX_TASKBOARD_URL`，可讓 CLI 指向另一個本機或區域網路服務。雲端部署透過**loopback companion**（本機 loopback 配套服務，不是「伴侶」）使用 `taskctl cloud login` 配置。

## 安裝 Codex Skill

將 `skills/manage-taskboard` 複製或符號連結到 Codex Skill 目錄，然後啟動新的 Codex 任務：

```bash
ln -s /absolute/path/to/codex-taskboard/skills/manage-taskboard \
  ~/.agents/skills/manage-taskboard
```

桌面 App 會讓該目錄與內建 Skill 保持同步。該 Skill 會指導 Codex 檢查任務，將其移到 `in_progress`，使用樂觀版本控管，驗證工作，然後將其移到 `in_review`；只有在使用者明確確認接受或要求將任務標記為完成後，才會將任務移到 `done`。

## 嵌入 Codex

### 手動：使用專用 CDP 連接埠

讓既有 Codex 視窗保持開啟。在 Taskboard repository中，使用專用 CDP 連接埠啟動第二個 Codex 實例：

```bash
open -n -a /Applications/ChatGPT.app --args \
  --remote-debugging-port=9231 \
  --remote-allow-origins=http://127.0.0.1:9231
```

新 Codex 視窗出現後，在另一個終端機中執行注入器：

```bash
CODEX_TASKBOARD_HOST=127.0.0.1 \
npm run codex:inject -- --port 9231 --open
```

使用嵌入式面板時，讓注入器終端機保持執行。原 Codex 視窗不會變化，新視窗會顯示 Taskboard 側邊欄入口。如果連接埠 `9231` 已被佔用，請在兩個命令中使用另一個連接埠。

### 建議：用一個命令啟動獨立 Taskboard 視窗

讓既有 Codex 視窗保持開啟，然後執行：

```bash
CODEX_TASKBOARD_HOST=127.0.0.1 npm run codex
```

該命令會在需要時啟動本機 Taskboard 服務。它會重用已開啟且有可用 CDP 渲染器的 Codex；普通 Codex 沒有 CDP 時，它會在該實例的原生瀏覽面板中開啟 Taskboard；沒有開啟 Codex 時，它會使用獨立配置文件和僅限迴環存取的連接埠 `9231` 啟動官方 macOS Codex App。有可用 CDP 時，它會在 Plugins 後注入一個原生外觀的 Taskboard 入口，並持續監視服務和替換後的渲染器。使用嵌入式面板時，請讓該命令保持執行。啟動器不會修改 `ChatGPT.app` 或其 `app.asar`。

原始碼啟動器會把帶身份資訊的服務地址寫入 `.data/launcher-runtime.json`。透過 `npm link` 安裝的 `taskctl` 預設讀取此文件。因此，普通 shell 和從面板開啟的 Codex 任務無需設定額外環境變數，即可使用同一個 Taskboard 服務。

### macOS App：無需終端機即可開啟和注入

如需進行 Tauri 開發，請執行：

```bash
npm run app:dev
```

如需建置本機 App 和 DMG，請先安裝兩個 Rust target，然後執行建置：

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run app:build
```

從 Finder 開啟 `src-tauri/target/universal-apple-darwin/release/bundle/macos/Codex Taskboard.app`。DMG 位於 `src-tauri/target/universal-apple-darwin/release/bundle/dmg/`。如果只需安裝穩定版，請從 [GitHub Releases](https://github.com/chuspeeism/dashi-taskboard/releases/latest) 下載目前 DMG。

該 App 包含自己的 Node 執行時、Taskboard 服務、建置後的 Web UI、Skill、CLI 包裝器和注入腳本。它會啟動服務，重用已開啟且有可用 CDP 渲染器的 Codex；普通 Codex 沒有 CDP 時，它會在該實例的原生瀏覽面板中開啟 Taskboard；沒有開啟 Codex 時，它會啟動官方 Codex App。有可用 CDP 時，它會等待渲染器並注入側邊欄入口，然後在不顯示終端機視窗的情況下開啟面板。該 App 可以複製到本工作目錄目錄之外；目標 Mac 只需安裝官方 Codex App，不需要此repository、系統 Node 安裝或單獨的 Codex CLI 安裝。Taskboard 資料儲存在 `~/Library/Application Support/Codex Taskboard`，啟動器輸出寫入 `~/Library/Logs/Codex Taskboard/codex-taskboard-launcher.log`。

本機建置使用 ad-hoc 程式碼簽署進行直接驗證。公開的 macOS 下載仍需要 Developer ID 簽署和 Apple 公證。

### Linux App：Ubuntu 24.04 x64 套件

Linux 桌面版第一版僅支援 Ubuntu 24.04 LTS x64。請先安裝官方 ChatGPT 桌面版 `.deb`，並確認執行 `chatgpt` 可以開啟它。然後從 [GitHub Releases](https://github.com/chuspeeism/dashi-taskboard/releases/latest) 下載 Codex Taskboard `.deb` 或 `.AppImage`。請將以下命令中的 `<file>` 替換為下載的檔名。

安裝 `.deb` 套件：

```bash
sudo apt install ./<file>.deb
```

或者執行 AppImage：

```bash
chmod +x ./<file>.AppImage
./<file>.AppImage
```

如需在 Ubuntu 24.04 x64 上建置這兩種套件，請執行：

```bash
npm ci
npm run app:build:linux:x64
```

第一版不支援 ARM64、Fedora、RPM 套件或其他 Linux 發行版。

### Windows App：托盤啟動器與內建 Taskboard

先從 Microsoft Store 安裝官方 Codex App。在 Windows x64 上執行以下命令建置目前使用者級 NSIS 安裝程式：

```powershell
npm ci
npm run app:build:windows
```

安裝程式位於 `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`。它包含托盤啟動器、內建 Node、本機服務、建置後的 Web UI、Skill、`taskctl.cmd` 和注入腳本。Taskboard 資料儲存在 `%APPDATA%\Codex Taskboard`，log儲存在 `%LOCALAPPDATA%\Codex Taskboard\Logs`，Skill 會複製到 `%USERPROFILE%\.agents\skills\manage-taskboard`。

Windows CI 成品目前有意保持未簽署，也不支援自動更新。分發前請閱讀[程式碼簽署政策](docs/code-signing-policy.md)。保留資料的行為見 [Windows 解除安裝說明](docs/windows-uninstall.md)。

Codex 26.715.52143 的渲染器 CSP 會阻止任意 HTTP iframe。因此，啟動器會啟用 CDP CSP 略過，重新載入該渲染器一次，安裝文件啟動腳本，並等待 Taskboard OOPIF 實際載入。同一台電腦上的其他程序存取 CDP 時不需要身分驗證，因此啟動器執行時只能執行受信任的本機程式碼。

要注入一個已經透過其他方式使用 CDP 啟動的 Codex 實例，請執行：

```bash
npm run codex:inject -- --port 9229 --open
```

該命令也會保持駐留，因此服務退出後，注入的標籤頁可以重新啟動 Taskboard。使用 `Ctrl-C` 停止該命令。

該腳本會在 Codex 側邊欄添加 Taskboard 入口，並在 Codex 的整個主工作區渲染 iframe，包括情境標題欄區域，因此 Taskboard 自己的頁首不會留下空白條。這個完整的矩形頁首位於 Electron 可拖動層之上，並標記為 `no-drag`；由於 Taskboard 活動時會隱藏原生情境操作，它自己的操作可以使用正常的邊緣留白，不會產生人為的右側空隙。原生側邊欄保持掛載，此前頁面的選中狀態和情境頁首會暫時隱藏；選擇另一個 Codex 頁面會恢復它們。

“在在對話中開啟”會在可用時選擇對應的原生 Codex 專案，並開啟一個未發送的原生 編輯器，其中包含 `e-taskboard` 指令和任務的真實標識符。已安裝的 Skill 會依據該指令自動選中，因此 編輯器 不會添加 `$manage-taskboard` 提及。只有在會話實際處理該任務後，才會記錄該會話的歸屬關係：`taskctl` 讀取 Codex 的 `CODEX_THREAD_ID`，並在任務或評論變更上記錄該 ID。記錄的 ID 可透過 Codex 的原生路由橋接點擊。每個任務可以綁定一個 Git 分支或一個 worktree；選項從所選 Codex 專案的repository掃描，而不是手動輸入。該集成使用 Codex 既有的專案、編輯器 和路由標記；它不會修改 React、替換 `fetch`、載入私有 chunk 或編輯 Codex 資料文件。

要使用不同的 UI 來源，請在使用者腳本執行前設定 `window.__CODEX_TASKBOARD_URL__`。

## 配置

| 變數 | 預設值 | 用途 |
| --- | --- | --- |
| `CODEX_TASKBOARD_HOST` | `0.0.0.0` | HTTP 繫結位址；使用 `127.0.0.1` 可停用區域網路存取 |
| `CODEX_TASKBOARD_PORT` | `47823` | 本機 HTTP 連接埠 |
| `CODEX_TASKBOARD_DATA_DIR` | `.data` | SQLite 資料目錄 |
| `CODEX_TASKBOARD_URL` | `http://127.0.0.1:47823` | CLI API 來源位址 |
| `CODEX_TASKBOARD_TRUSTED_ORIGINS` | 未設定 | 允許透過 loopback 反向通道連線的 HTTPS 完整來源，以逗號分隔 |

`npm start` 會輸出本機 URL 和可用的區域網路 URL。同一受信任網路中的協作者可以開啟其中一個區域網路 URL，並使用同一個 Taskboard 服務。任務、評論和附件變化透過伺服器發送事件廣播到所有開啟的客戶端；客戶端重連後會執行完整重新整理，因此不會遺漏斷開連接期間發生的變化。使用 `taskctl` 的協作者可以透過 `CODEX_TASKBOARD_URL=http://<host-ip>:47823` 指向共用服務。

區域網路模式沒有帳戶身分驗證：受信任本機網路中任何能存取該 URL 的人都可以讀取和寫入 Taskboard。公網和雲端部署需要經過身分驗證的部署邊界。

## 透過 Cloudflare 共用

對於兩名受信任的協作者，Taskboard 可以在 Cloudflare 上執行，使用 Worker Static Assets 和 API 路由，以 D1 作為權威業務資料庫，並使用私有 R2 bucket 儲存附件。該部署使用帶共用密碼的 HTTPS Basic 身分驗證，並在全域修訂號變化後重新整理已開啟的面板。

每臺設備保留自己的專案工作目錄映射，並繼續使用**本機 companion**（本機配套服務 / 環回代理）提供 Codex、Git/worktree、Skill 和 MCP 能力。請勿將 companion 譯為「伴侶」，也不要把普通 Taskboard HTTP 接口稱為「伴侶 API」。雲端模式絕不會回退到本機 SQLite 資料庫，也不會同時寫入本機資料庫。

請參閱[雲端協作](docs/cloud-collaboration.md)，瞭解所有者部署、既有 GitHub 安裝設定、密碼輪換、本機路徑映射和一次性本機資料遷移流程。

## 驗證

```bash
npm run check
```

該命令會執行 TypeScript 檢查、生產前端建置、組件測試，以及伺服器/CLI/注入測試套件。

## 任務 Markdown

任務描述和評論支援 GFM，包括表格和任務清單。`mermaid` 圍欄程式碼塊會在查看器載入後渲染成只讀圖；渲染失敗時仍可閱讀原始圖表原始碼。Markdown HTML 註釋（例如 `<!-- trace-analysis:v1 ... -->`）不會出現在渲染後的正文中，且不會啟用原始 HTML。

### Windows 程式碼簽署

應用程式核准後，正式 Windows 版本將採用 [SignPath.io](https://signpath.io/) 提供的免費程式碼簽署，憑證由 [SignPath Foundation](https://signpath.org/) 提供。在核准前，目前的 Windows CI 成品仍未簽署。詳情請參閱[程式碼簽署政策](docs/code-signing-policy.md)、[隱私權政策](PRIVACY.md)與 [Windows 解除安裝說明](docs/windows-uninstall.md)。

### LAN 與反向通道設定


若要使用連到本機監聽服務的反向通道，請將 `CODEX_TASKBOARD_TRUSTED_ORIGINS` 設為通道的公開 HTTPS 來源，例如 `https://board.example.test`。多個來源請以逗號分隔。此變數不可為空，也不接受重複來源（包含尾端斜線或 HTTPS 預設連接埠等正規化後相同的來源）。每個專案都必須是完整 HTTPS 來源；不接受路徑、查詢、片段、帳密或萬用字元。反向代理或通道必須保留公開的 `Host`，Taskboard 會據此推導標準 HTTPS 來源並要求與設定完全相符。如果瀏覽器提供 `Origin` 標頭，系統也會獨立驗證；代理必須保留該標頭，不得自行偽造。系統不使用轉送標頭。已設定的公開主機與信任來源可使用一般 Taskboard HTTP 和即時端點，但即使通道的 socket 位於 loopback，本機裝置功能路由仍無法使用。直接使用本機或私人區域網路主機與來源時，既有行為不變。

### 致謝

感謝 [Lingshan21](https://github.com/Lingshan21) 提供：

- 專案父任務完成方式的提案與初始實作 [#371](https://github.com/chuspeeism/dashi-taskboard/pull/371)：不論每個頂層父任務包含多少子任務，權重都相同。
- 優先順序整理方式的提案與初始實作 [#372](https://github.com/chuspeeism/dashi-taskboard/pull/372)。最終看板排序控制依維護者需求調整，未採用提案中的優先泳道。
