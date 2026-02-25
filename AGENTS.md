# Agents

## Cursor Cloud specific instructions

### Overview
Nx Console is an Nx monorepo producing a VS Code extension (`apps/vscode`), a JetBrains IntelliJ plugin (`apps/intellij`), an MCP server (`apps/nx-mcp`), and a shared Nx Language Server (`apps/nxls`). No databases or external services are required.

### Prerequisites
- **Node.js v18** (LTS Hydrogen) — pinned in `.nvmrc`
- **Yarn 3.2.3** — pinned via `.yarnrc.yml` `yarnPath`; uses `node-modules` linker
- **Java 21 + Gradle** — only for the IntelliJ plugin (`apps/intellij`); not needed for TS-only work

### Key commands
All commands documented in `CONTRIBUTING.md`. Quick reference:
- **Lint:** `yarn nx run-many --target=lint`
- **Test:** `yarn nx run-many --target=test` (Jest for TS projects, Gradle `check` for IntelliJ)
- **Build:** `yarn nx build vscode` / `yarn nx build nxls` / `yarn nx build nx-mcp`
- **Format check:** `node ./tools/scripts/check-formatting.js` (also the pre-commit hook)
- **Format fix:** `yarn nx format:write`

### Environment file
The `.env` file at the workspace root sets `NX_ISOLATE_PLUGINS=true` and `NX_NATIVE_COMMAND_RUNNER=false`. Do not remove it.

### Gotchas
- The `yarn watch` / `nx run vscode:watch:debug` command requires the Nx Daemon (`npx nx daemon --start`). In headless/containerized environments the daemon's file watcher may not initialize properly, causing watch to fail. Use one-off builds (`nx run vscode:build:debug`) instead.
- The VS Code extension cannot be launched in a headless Cloud Agent environment (it requires VS Code's Extension Development Host via F5). Test changes through unit tests and builds.
- The nx-mcp server can be tested standalone: `node dist/apps/nx-mcp/main.js --sse --port 9921 /path/to/workspace`. It only supports a single concurrent SSE connection; the SSE connection must remain open to receive tool call responses.
- The nxls language server is designed for stdio communication with IDE clients. It can be verified to start with `node dist/apps/nxls/main.js --stdio` but will error on connection disposal when stdin closes — this is expected.
