# 在 Windows 解除安裝 Codex Taskboard

1. 從系統匣選單結束 Codex Taskboard。
2. 開啟 **設定 > 應用程式 > 已安裝的應用程式**。
3. 找到 **Codex Taskboard**，開啟選單並選擇 **解除安裝**。
4. 完成 NSIS 解除安裝程序。

解除安裝程式會移除應用程式檔案，但會保留 Taskboard 任務、附件、設定、log、獨立的 Codex 設定檔和內建 Skill，方便日後重新安裝時沿用。

若要移除保留的資料，請先關閉 Codex Taskboard，再刪除目前 Windows 使用者的下列目錄：

- `%APPDATA%\\Codex Taskboard`
- `%LOCALAPPDATA%\\Codex Taskboard`
- `%USERPROFILE%\\.agents\\skills\\manage-taskboard`

刪除第一個目錄會永久移除本機 Taskboard 任務和附件。這不會移除官方 Codex 應用程式、使用者平常使用的 Codex 設定檔或 Codex 專案。
