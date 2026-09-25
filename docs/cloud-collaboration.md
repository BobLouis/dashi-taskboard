# 雲端協作

Codex Taskboard 可部署在 Cloudflare，供兩位彼此信任的協作者共用：

- 單一 Worker 提供建置後的介面與 JSON API；
- D1 是業務資料的主要資料庫；
- 私有 R2 bucket 儲存附件；
- 一個由 SQLite 支援的 Durable Object，透過休眠式 WebSocket 廣播修訂變更；
- 介面、API 與附件路由使用 HTTPS Basic Authentication；`/health` 為公開端點；
- 看板收到修訂事件時會重新整理；重新連線時只檢查一次修訂，不會定期輪詢。

正式環境資源名稱如下：

| 資源 | 名稱 |
| --- | --- |
| Worker | `board` |
| D1 資料庫 | `codex-taskboard-db` |
| R2 bucket | `codex-taskboard-attachments` |
| Durable Object 類別 | `RealtimeHub` |

本服務採用共用密碼的信任模式。Basic Authentication 的使用者名稱只會顯示為任務和留言的操作者名稱，並非經驗證的身分。知道共用密碼的人具有完整讀寫權限，也可以選用任何操作者名稱。請只和你信任的協作者共用。

## 保留在本機的資料

雲端會儲存專案、任務、留言、關聯與附件資料，不會儲存裝置上的專案或 worktree 絕對路徑。

每位協作者都會執行**本機 companion**：一個供 Codex、Git/worktree 掃描、已安裝 Skill/MCP 探索與專案路徑對應使用的**裝置本機 loopback 服務**（不是聊天角色）。companion 會將雲端 URL、操作者名稱、共用密碼和裝置專用的專案對應資料，以權限模式 `0600` 儲存在 `.data/cloud-companion.json`。一般 Taskboard HTTP 路由（任務、留言、附件）就是共用 API，並沒有另一套「companion API」。

啟用雲端模式時，雲端是唯一的業務資料來源。雲端請求失敗時會明確顯示錯誤。companion 不會改用本機 SQLite 資料庫，也不會同時寫入兩個資料庫。執行 `taskctl cloud logout` 會讓該裝置回到獨立的本機模式，不會合併本機和雲端資料。

## 擁有者：在本機驗證

安裝相依套件並建置前端：

```bash
npm ci
npm run build:web
```

建立會被 Git 忽略的 `.dev.vars` 檔案，填入僅供本機使用的 `TASKBOARD_SHARED_SECRET`，將 D1 migration 套用到 Wrangler 本機狀態，然後啟動 Worker：

```bash
npm run cloud:migrate:local
npm run dev:cloud
```

開啟終端機顯示的 loopback URL。瀏覽器會顯示原生 Basic Authentication 提示；使用任何本機操作者名稱作為使用者名稱，並使用 `.dev.vars` 中的值作為密碼。

Wrangler 本機狀態位於 `.wrangler/`，不會提交至 Git。

## 擁有者：部署

先登入 Wrangler：

```bash
npx wrangler login
npx wrangler whoami
```

使用上述資源名稱建立正式環境的 D1 資料庫和私有 R2 bucket：

```bash
npx wrangler d1 create codex-taskboard-db
npx wrangler r2 bucket create codex-taskboard-attachments
```

`wrangler.jsonc` 包含正式環境設定，並以資源名稱和 `database_id` 指定 D1 binding。D1 資料庫 ID 是公開中繼資料，不會授予存取權，因此可以提交到 Git。Wrangler 本機開發會在 `.wrangler/` 建立持久的本機對應資源；這些是本機模擬環境，不是額外的 Cloudflare 環境。

套用遠端 D1 migration，並確認部署套件內容：

```bash
npm run cloud:migrate
npm run cloud:deploy:dry-run
```

資料庫結構就緒後，透過 Wrangler 的私密互動提示設定共用密碼。請勿將密碼放進 `wrangler.jsonc`、shell 命令、log 或已提交的檔案。接著部署正式 Worker：

```bash
npx wrangler secret put TASKBOARD_SHARED_SECRET
npm run cloud:deploy
```

以上命令會建立或更新 Cloudflare 資源。此 repository 會包含 binding 使用的正式 D1 資料庫 ID，但不包含共用密碼、API token 或 OAuth token。請勿將這些憑證放進 Git；複製 repository 不會授予存取權，也不代表 Worker 已經部署。

透過可信任的管道，將已部署 Worker 的 HTTPS origin 和共用密碼交給另一位協作者。絕不要將密碼公開在 repository、issue 或 log 中。

Cloudflare 文件：

- [Workers Static Assets binding](https://developers.cloudflare.com/workers/static-assets/binding/)
- [使用 WebSocket Hibernation 的 Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [建立 R2 bucket](https://developers.cloudflare.com/r2/buckets/create-buckets/)
- [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

## 協作者：連線既有的 GitHub 安裝版本

擁有者也要依照本節設定自己的裝置，並使用自己的操作者名稱與工作目錄路徑。協作者不需要你的本機資料庫或檔案系統路徑。先更新既有 clone 並建置目前的介面：

```bash
git pull --ff-only
npm ci
npm run build:web
```

啟動本機 companion：

```bash
CODEX_TASKBOARD_HOST=127.0.0.1 npm start
```

在另一個終端機設定雲端模式。使用已部署的 HTTPS Worker origin，選擇要顯示在操作紀錄中的操作者名稱，並且只在私密的 `Shared key:` 提示中輸入共用密碼：

```bash
npm run taskctl -- cloud login \
  --url https://YOUR-WORKER-ORIGIN \
  --actor-name "FRIEND-DISPLAY-NAME"

npm run taskctl -- cloud status
npm run taskctl -- project list
```

密碼不會出現在命令中，提示輸入時也不會回顯。

每個要搭配 Codex 使用的雲端專案，都要對應到協作者自己裝置上的絕對工作目錄路徑：

```bash
npm run taskctl -- project map PROJECT_ID \
  --workspace-path /absolute/path/on/their/device
```

擁有者也要以自己的路徑執行相同的對應命令。每台裝置的對應資料刻意保持獨立，不會同步至 D1。

啟動已注入的 Codex 視窗：

```bash
CODEX_TASKBOARD_HOST=127.0.0.1 npm run codex
```

`npm run codex` 會重用或啟動 loopback companion。使用嵌入式看板時，請保持它執行。companion 提供本機 Codex/Git/Skill/MCP 功能，並且只會透過 HTTPS Basic `Authorization` 標頭將共用密碼送到 Worker。它不會將密碼寫入 D1 或 R2、不會回傳給瀏覽器介面，也不會記錄在 log 中。裝置路徑也不會傳到 Cloudflare。

此流程請勿將 `CODEX_TASKBOARD_URL` 直接設為雲端 origin。`taskctl` 會連線到 loopback companion，由它處理 Basic Authentication 和裝置專用的專案路徑對應。如果 companion 使用非預設的 loopback 連接埠，請將 `CODEX_TASKBOARD_COMPANION_URL` 設為該 loopback origin。

## 僅使用瀏覽器

任何一位協作者都可以直接開啟已部署的 HTTPS Worker URL。瀏覽器原生的 Basic Authentication 提示會要求輸入：

- 使用者名稱：該瀏覽器要顯示的操作者名稱；
- 密碼：共用密碼。

瀏覽器介面支援共用看板和附件。裝置專用的 Codex、Git/worktree、Skill 和 MCP 功能仍需要本機 companion。

## 輪替或撤銷共用密碼

擁有者透過 Wrangler 的互動提示更新 Worker secret：

```bash
npx wrangler secret put TASKBOARD_SHARED_SECRET
```

輪替後，兩台裝置都要重新執行 `taskctl cloud login` 並輸入新密碼。僅使用瀏覽器的使用者也必須重新驗證；瀏覽器可能會快取 Basic Authentication 憑證，因此可能需要關閉已驗證的瀏覽器工作階段或清除網站驗證資料。

由於兩位協作者共用同一組密碼，輪替會同時影響兩人。這個兩人信任模式不支援個別撤銷使用者權限。

## 進階：一次性匯入既有本機資料

遷移工具會使用 `VACUUM INTO` 建立一致的 SQLite 快照、移除裝置專用的結構化路徑、匯出附件雜湊，並建立私密封存檔。預設的本機路徑如下：

```bash
npm run cloud:data -- export \
  --database .data/taskboard.sqlite \
  --attachments .data/attachments \
  --output cloud-migration-exports/initial
```

輸出目錄包含任務內容和附件檔案。目錄權限會限制存取，而且會被 Git 忽略，但仍必須當作私密資料處理。若雲端看板從空白狀態開始，這項匯出作業並非必要。

匯入前，請先登入 Wrangler、建立上述 D1 和 R2 資源，並執行 `npm run cloud:migrate`，確保遠端 D1 結構已就緒。目標 D1 不得包含任何專案，封存檔中的附件 key 也不得已存在於 R2。若目標資料庫不是空的，匯入會拒絕執行，不會合併或覆寫資料。

使用明確確認遠端操作的 Wrangler adapter 執行一次性遷移：

```bash
TASKBOARD_MIGRATION_REMOTE=1 npm run cloud:data -- import \
  --bundle cloud-migration-exports/initial \
  --adapter ./scripts/wrangler-cloud-adapter.mjs

TASKBOARD_MIGRATION_REMOTE=1 npm run cloud:data -- verify \
  --bundle cloud-migration-exports/initial \
  --adapter ./scripts/wrangler-cloud-adapter.mjs
```

這兩個命令都需要 `TASKBOARD_MIGRATION_REMOTE=1` 這道明確的安全檢查。adapter 會使用目前的 Wrangler 登入狀態，以及 `wrangler.jsonc` 中的正式資源名稱；它不會新增 HTTP 遷移端點，也不會儲存 Cloudflare 憑證。部署時不會自動執行這些命令，因此有了 repository 不代表資料已經匯入。

adapter 有一項本機持久化整合測試，不會連線到遠端 Cloudflare 資源：

```bash
node --test test/cloud-migration.test.mjs
```
