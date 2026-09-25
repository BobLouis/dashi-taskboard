# DeepSeek Harness 外掛

此目錄是可安裝的 DeepSeek Harness 套件。它會在 Harness 側邊欄新增 Taskboard 項目，並開啟目前安裝的 Codex Taskboard 執行環境。

在 DeepSeek Harness 原始碼工作目錄中，將此外掛安裝到 Web 設定檔：

```sh
pnpm dsh plugin --profile web add /absolute/path/to/codex-taskboard/integrations/deepseek-harness
```

開啟側邊欄項目前，請先啟動 Codex Taskboard。外掛會讀取啟動器管理的執行階段檔案，因此不需要固定連接埠。
