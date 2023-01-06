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

#### With `lsp-zero`

If you're using `lsp-zero`, the configuration can be as followed 

```lua
local lsp = require('lsp-zero')
local lsp_util = require('lspconfig.util')

-- your configs

local bin_name = 'nxls'
local cmd = { bin_name, '--stdio'}

if vim.fn.has 'win32' == 1 then
    cmd = {'cmd.exe', '/C', bin_name, '--stdio'}
end

lsp.configure('nxls', {
    force_setup = true, -- this ensures lsp-zero runs lspconfig.nxls.setup {}
    cmd = cmd,
    filetypes = { 'json', 'jsonc'},
    root_dir = lsp_util.root_pattern('nx.json', '.git'),
    settings = {},
})

-- your other configs

lsp.setup()
```

## Implementations

- `onCompletion`

  - Provides completion results within `project.json`, and `workspace.json` files.
  - Lists installed executors when writing out new targets for a project.
  - Provides relevant option completion results for the selected executor
    > Support for `nx.json` files is coming soon.

- `onHover`
  - Provide option descriptions for `project.json` and `workspace.json` executors.
