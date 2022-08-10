# Nx Language Server

A language server that utilizes the [json-languageservice](https://github.com/Microsoft/vscode-json-languageservice) to provide code completion and more, for Nx workspaces.

## Usage

Nx Console includes this language server with the main extension. There's nothing to configure if you use the Nx Console extension

For other editors (nvim, etc), you should install the server to be accessible in your path:

```
npm i -g nxls
```

### nvim

You should be able to configure the nxls using [nvim-lspconfig](https://github.com/neovim/nvim-lspconfig).

## Implementations

- `onCompletion`

  - Provides completion results within `project.json`, and `workspace.json` files.
  - Lists installed executors when writing out new targets for a project.
  - Provides relevant option completion results for the selected executor
    > Support for `nx.json` files is coming soon.

- `onHover`
  - Provide option descriptions for `project.json` and `workspace.json` executors.
