# 程式碼簽署政策

應用程式核准後，正式 Windows 版本將採用 [SignPath.io](https://signpath.io/) 提供的免費程式碼簽署，憑證由 [SignPath Foundation](https://signpath.org/) 提供。在核准前，目前的 Windows CI 成品仍未簽署。

## 適用範圍

本政策適用於 Codex Taskboard 專案發布的正式 Windows 執行檔與安裝程式。開發建置、pull request 成品和本機建置不會簽署。

## 團隊角色

- 作者與提交者：[\@jadon7](https://github.com/jadon7) 和 [\@chuspeeism](https://github.com/chuspeeism)。
- 審查者：[\@jadon7](https://github.com/jadon7) 和 [\@chuspeeism](https://github.com/chuspeeism)。其他貢獻者的變更會透過 pull request 審查後再合併。
- 核准者：repository 擁有者 [\@chuspeeism](https://github.com/chuspeeism)。每次簽署申請都需要人工核准。

## 建置與核准

- 簽署所用的輸入檔必須來自公開 repository 和 GitHub 託管的 Actions 工作流程。本機電腦建置的成品不符合資格。
- 每個簽署成品都必須記錄來源修訂版本和工作流程執行紀錄。
- 專案維護者必須審查發布變更，並人工核准每一項簽署申請。
- 簽署角色必須使用個人帳戶並啟用多重要素驗證。簽署憑證不得儲存在 repository 或工作流程 log 中。
- 簽署後發布的成品不得再修改。

## 隱私權

Codex Taskboard 的資料處理方式和網路活動詳見[隱私權政策](../PRIVACY.md)。

## 事故應變

若懷疑簽署憑證或已簽署成品遭到入侵，維護者會停止簽署和發佈、保留相關工作流程及成品紀錄、通知簽署服務提供者，並在必要時要求撤銷憑證。事件處理完成後，會根據經審查的來源修訂版本重新建置替代版本。

安全性問題請使用 repository 的私密弱點通報管道。非敏感的簽署問題可在公開 issue tracker 提出。
