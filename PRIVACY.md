# 隱私權政策

Codex Taskboard 採本機優先設計。桌面啟動器會在你的電腦上執行 Taskboard 服務，不會將看板內容或使用情形分析資料傳送給專案維護者。

## 儲存在電腦上的資料

在 Windows 上，Codex Taskboard 會將資料庫、附件、啟動器執行階段檔案，以及獨立的 Codex 瀏覽器設定檔儲存在：

`%APPDATA%\\Codex Taskboard`

啟動器 log 儲存在：

`%LOCALAPPDATA%\\Codex Taskboard\\Logs`

啟動器也會將內建的 `manage-taskboard` Skill 安裝到目前使用者的 `.agents\\skills\\manage-taskboard` 目錄。

## 網路活動

- 桌面應用程式會使用僅限 loopback 的 HTTP 服務，連接同一台電腦上的嵌入式面板、啟動器與 `taskctl`。
- 更新程式會檢查此專案的 GitHub Releases 端點，確認是否有可用版本。
- 官方 Codex 應用程式與 Codex CLI 會依照使用者既有的 OpenAI 帳戶及 OpenAI 條款使用 OpenAI 服務。
- 雲端協作為選用功能。使用者設定後，Taskboard 資料會傳送到使用者選擇的部署環境。

Codex Taskboard 不包含廣告，也不使用專案維護者提供的分析服務。

## 移除資料

解除安裝 Windows 應用程式會移除程式本身，但會保留使用者資料和已安裝的 Skill。如需選擇性手動清理，請參閱 [Windows 解除安裝說明](docs/windows-uninstall.md)。
