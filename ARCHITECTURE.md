## Architecture Overview

This document exists to give newcomers an idea of how the Nx Console repo is structured. To learn about VSCode extension development in general, refer to the [Extension API](https://code.visualstudio.com/api) docs.

Nx Console consists of three main apps:

- `vscode` bundles all extension functionality and defines all contribution points, incuding
  - the Nx language server (`nxls`)
  - the `vscode-ui` angular project
  - the Nx Console activity bar item with different views
  - a project graph integration within VSCode
  - various commands and smaller features that make working with Nx easier
- `vscode-ui` is an angular project that renders the [generator](https://nx.dev/recipe/console-generate-command) / [executor](https://nx.dev/recipe/console-run-command) webviews
- `nxls` is a platform-agnostic language server based on the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/). It has various capabilites to enhance the Nx development experience.

> :bulb: The fourth app `vscode-ui-feature-task-execution-form-e2e` is used for e2e testing and is WIP

### Views

Nx Console contributes different views in a dedicated activity bar item. </br>
The views are provided in [`apps/vscode/src/main.ts`](apps/vscode/src/main.ts) and source code can be found in the corresponding libs at `libs/vscode/nx-***-view`.

### Utilities

There are multiple libs that are relevant across features, for example:

- the `workspace` lib that provides information about the current Nx workspace is central to both extension and language service functionality
- the `file-system` lib provides cross-platform access to the file system
