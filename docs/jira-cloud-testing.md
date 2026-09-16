# Jira Cloud testing on Windows

Run these steps from the feature worktree with Node.js 22.5 or newer. Keep the installed Taskboard available; uninstalling is unnecessary and does not clear its retained data.

## 1. Automated checks

```powershell
npm ci
node --test test/jira-cloud-search.test.mjs
npm run typecheck
npm run build:web
git diff --check
```

The Jira test injects HTTP responses into the public integration and exercises initial connection followed by forced sync. It checks enhanced search requests, two-page aggregation, authentication headers and the tasks handed to the database. It uses fake credentials and no remote Jira instance. In the test-first workflow, the test must initially fail because the old search endpoint returns HTTP 410, then pass after implementation.

Other existing checks, when relevant:

| Command | Coverage |
| --- | --- |
| `npm test` | Node tests plus the configured component test |
| `npm run test:components` | MarkdownDocument component test |
| `npm run test:cloud` | Cloud Worker, not Jira Cloud integration |
| `npm run check` | Typecheck, web build and the full test command |

Some browser tests skip without a usable Chrome executable; on Windows set `CHROME_BIN` when running those tests. Launcher source assertions and mocked requests do not prove a real installed App or Jira connection works.

Use `build:web` for this procedure. `npm run build` additionally attempts to refresh a running Codex injection. The Vite development proxy is fixed to port 47823, so the procedure below serves the built UI from the isolated server instead.

## 2. Isolated source deployment

Use a new PowerShell terminal in the feature worktree. The following environment changes apply only to that terminal and its child processes. Port 47831 is an example; choose another free port if occupied.

```powershell
$jiraTestPort = 47831
if (Get-NetTCPConnection -State Listen -LocalPort $jiraTestPort -ErrorAction SilentlyContinue) {
  throw "Choose another unused Jira test port."
}
$env:CODEX_TASKBOARD_HOST = '127.0.0.1'
$env:CODEX_TASKBOARD_PORT = [string]$jiraTestPort
$env:CODEX_TASKBOARD_DATA_DIR = Join-Path (Get-Location).Path '.data/jira-cloud-test'
Remove-Item Env:CODEX_TASKBOARD_LISTEN_FD -ErrorAction SilentlyContinue
Remove-Item Env:CODEX_TASKBOARD_INSTANCE_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:CODEX_TASKBOARD_INSTANCE_SECRET -ErrorAction SilentlyContinue
Remove-Item Env:CODEX_TASKBOARD_TRUSTED_ORIGINS -ErrorAction SilentlyContinue
node server/index.mjs
```

Open `http://127.0.0.1:47831/` using the selected port. Confirm `/health` responds and that the Jira connection form includes Email / API token guidance.

The SQLite database, Jira connection configuration and attachments live under the chosen `.data/jira-cloud-test` directory, which Git ignores. This must not be `%APPDATA%\Codex Taskboard`, the installed launcher's data directory. The service is loopback-only and does not require a launcher or injector.

### Live Jira acceptance

1. In the local UI, connect to your `https://<site>.atlassian.net` using your Atlassian email and API token. Enter credentials only in the local form, not in chat, screenshots, command arguments or test reports.
2. Optionally select a project containing issues assigned to that account. The existing query includes unfinished issues and completed issues updated within 30 days.
3. Confirm connection succeeds and the expected issue keys, titles, descriptions and statuses appear. Compare against Jira using the same account and query, not against the entire project.
4. Trigger sync again and confirm the displayed tasks remain correct. This read-path test does not require editing remote Jira issues.
5. Stop this source server with Ctrl+C and restart using the same directory and environment. Verify the saved connection and tasks remain available and syncing still succeeds.
6. If the account has enough matching issues for multiple pages, compare the full result count. Otherwise record live pagination as not exercised; the automated test covers token pagination independently.

Record the commit or working-tree state, runtime URL, data directory, checks performed, results and limitations. Never include the contents of `jira-connection.json`; it contains credentials. A successful mock or empty result is not proof that real issue content was imported.

## 3. Codex embedded verification

After the source UI successfully connects to real Jira, verify the same behavior in the Codex Taskboard panel. Coordinate this step separately from the installed launcher's runtime:

- Identify the active launcher and injector before starting another. Two injectors must not control the same Codex renderer.
- Use the feature worktree's built UI and backend with its own data directory, runtime descriptor and port. A separate managed Codex profile and CDP endpoint are also needed when running an isolated injected instance.
- If the existing runtime cannot be isolated reliably, temporarily exit the installed Taskboard launcher for this check; keep the installation and its data. Coordinate any Codex restart before performing it.
- Verify the panel reaches the test backend and completes Jira sync, then stop only processes started for this test and restore normal operation.

Do not treat `npm run app:dev` as isolated automatically. The native Windows launcher selects `%APPDATA%\Codex Taskboard` and synchronizes a shared Skill, so a second native build can affect existing state.

## 4. Optional installer acceptance

This is separate from source deployment. To validate the actual Windows installer, build with `npm run app:build:windows` (requires Rust and Visual Studio C++ build tools), then install the NSIS output from `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/` in a separate Windows user account or VM with Codex installed.

Start the packaged launcher, verify the embedded panel, connect to Jira, sync, restart and repeat. Record the installer identity and result. An installer build succeeding does not prove installation or injection works. Do not overwrite the normal user's installed App merely to test this API change.
