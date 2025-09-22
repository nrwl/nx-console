## 0.6.5 (2025-09-22)

This was a version bump only for nx-mcp to align it with other projects, there were no code changes.

## 0.6.4 (2025-09-15)

### 🚀 Features

- **nx-mcp:** update project_details tool description and return dependencies from it ([#2745](https://github.com/nrwl/nx-console/pull/2745))

### 🩹 Fixes

- **nx-mcp:** do not block mcp init with project graph computation ([#2752](https://github.com/nrwl/nx-console/pull/2752))

### ❤️ Thank You

- MaxKless @MaxKless

## 0.6.3 (2025-08-27)

This was a version bump only for nx-mcp to align it with other projects, there were no code changes.

## 0.6.2 (2025-08-27)

### 🚀 Features

- **nx-mcp:** expose recent CIPEs as MCP resources ([#2694](https://github.com/nrwl/nx-console/pull/2694))
- **vscode:** use vscode api to register mcp server & migrate cursor to stdio mcp ([#2650](https://github.com/nrwl/nx-console/pull/2650))
- enable mcp to communicate with IDE via JSON-RPC server ([#2640](https://github.com/nrwl/nx-console/pull/2640))
- **nx-mcp:** add streamable http as a transport option & restructure args slightly ([#2632](https://github.com/nrwl/nx-console/pull/2632))
- **nx-mcp:** default workspace path ([#2531](https://github.com/nrwl/nx-console/pull/2531))
- **vscode:** enable support for streamable http transport in vscode mcp ([#2500](https://github.com/nrwl/nx-console/pull/2500))
- add mcp and copilot support for cipe details ([#2469](https://github.com/nrwl/nx-console/pull/2469))
- add mcp tool with for available plugins ([#2448](https://github.com/nrwl/nx-console/pull/2448))
- **nx-mcp:** support communication via sse in the standalone mcp server ([#2441](https://github.com/nrwl/nx-console/pull/2441))
- add nx mcp ([#2415](https://github.com/nrwl/nx-console/pull/2415))

### 🩹 Fixes

- **nx-mcp:** always process.exit() to avoid hanging processes ([#2711](https://github.com/nrwl/nx-console/pull/2711))
- improve nx-mcp & nxls exit handlers ([#2688](https://github.com/nrwl/nx-console/pull/2688))
- **vscode:** repair socket & route task retrieval through ideProvider ([#2674](https://github.com/nrwl/nx-console/pull/2674))
- **nx-mcp:** make sure relative path is resolved when passing it to nx-mcp ([#2541](https://github.com/nrwl/nx-console/pull/2541))
- **nx-mcp:** workspace tools shouldn't be available if cwd is not an nx workspace ([#2540](https://github.com/nrwl/nx-console/pull/2540))
- **nx-mcp:** dont call console.log directly in stdio mode ([#2480](https://github.com/nrwl/nx-console/pull/2480))
- keep mcp alive by implementing heart beat functionality ([#2473](https://github.com/nrwl/nx-console/pull/2473))
- **vscode:** include local plugins in tool result & hide community plugins for now ([#2454](https://github.com/nrwl/nx-console/pull/2454))

### ❤️ Thank You

- Jonathan Cammisuli @Cammisuli
- MaxKless @MaxKless