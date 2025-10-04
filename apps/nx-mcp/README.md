# Nx MCP Server

![npm version](https://img.shields.io/npm/v/nx-mcp)

A [Model Context Protocol](https://modelcontextprotocol.io/introduction) server implementation for [Nx](https://nx.dev).

## Overview

The Nx MCP server gives LLMs deep access to your monorepo’s structure: project relationships, file mappings, runnable tasks, ownership info, tech stacks, Nx generators, and even Nx documentation. With this context, LLMs can generate code tailored to your stack, understand the impact of a change, and apply modifications across connected files with precision. This is possible because Nx already understands the higher-level architecture of your workspace, and monorepos bring all relevant projects into one place.

Read more in [our blog post](https://nx.dev/blog/nx-made-cursor-smarter) and [in our docs](https://nx.dev/features/enhance-AI).

## Installation and Usage

There are two ways to use this MCP server:

### a) Run it via the nx-mcp package

Simply invoke the MCP server via `npx` or your package manager's equivalent.

Here's an example of a `mcp.json` configuration:

```json
{
  "servers": {
    "nx-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["nx-mcp@latest"]
    }
  }
}
```

<details>
<summary>Claude Code</summary>
  
```sh
claude mcp add nx-mcp npx nx-mcp@latest
```

</details>

<details>
<summary>VSCode</summary>
  
```sh
code --add-mcp '{"name":"nx-mcp","command":"npx","args":["nx-mcp"]}'
```

</details>

<details>
<summary>Warp</summary>

Go to `Settings` -> `AI` -> `Manage MCP Servers` -> `+ Add` to [add an MCP Server](https://docs.warp.dev/knowledge-and-collaboration/mcp#adding-an-mcp-server).

Alternatively, use the slash command `/add-mcp` in the Warp Agent prompt.

```json
{
  "nx-mcp": {
    "command": "npx",
    "args": [
      "nx-mcp@latest"
    ]
  }
}
```

</details>

Refer to your AI tool's documentation for how to register an MCP server. For example, [Cursor](https://docs.cursor.com/context/model-context-protocol) or [Claude Desktop](https://modelcontextprotocol.io/quickstart/user) support MCP.

If you want to host the server instead of communicating via `stdio`, you can use the `--sse` and `--port` flags. Keep in mind that the Nx MCP server only supports a single concurrent connection right now, so connecting multiple clients at the same time might break in some cases.

Run `nx-mcp --help` to see what options are available.

### b) Use the Nx Console extension

If you're using Cursor you can directly install the Nx Console extension which automatically manages the MCP server for you.

More info:

- [Install Nx Console](https://nx.dev/getting-started/editor-setup)
- [Configure Cursor to use the nx-mcp](https://nx.dev/features/enhance-AI#cursor)

## Available Tools

The Nx MCP server provides a comprehensive set of tools for interacting with your Nx workspace.

- **nx_docs**: Returns documentation sections relevant to user queries about Nx
- **nx_available_plugins**: Lists available Nx plugins from the core team and local workspace plugins
- **nx_workspace_path**: Returns the path to the Nx workspace root
- **nx_workspace**: Returns readable representation of project graph and nx.json configuration
- **nx_project_details**: Returns complete project configuration in JSON format for a given project
- **nx_generators**: Returns list of generators relevant to user queries
- **nx_generator_schema**: Returns detailed JSON schema for a specific Nx generator
- **nx_current_running_tasks_details**: Lists currently running Nx TUI processes and task statuses
- **nx_current_running_task_output**: Returns terminal output for specific running tasks
- **nx_run_generator**: Opens generate UI with prefilled options (requires running IDE instance)
- **nx_visualize_graph**: Visualizes the Nx graph (requires running IDE instance)

### Nx Cloud Tools (only available w/ Nx Cloud enabled)

- **nx_cloud_cipe_details**: Returns CI pipeline execution details from Nx Cloud
- **nx_cloud_fix_cipe_failure**: Returns failure details including terminal output and git diffs
- **nx_cloud_pipeline_executions_search**: Searches for pipeline executions in Nx Cloud
- **nx_cloud_pipeline_executions_details**: Gets detailed information about specific pipeline executions
- **nx_cloud_runs_search**: Searches for runs within pipeline executions
- **nx_cloud_runs_details**: Gets detailed information about specific runs
- **nx_cloud_tasks_search**: Searches for task statistics and performance data
- **nx_cloud_tasks_details**: Returns detailed task execution information

When no workspace path is specified, only the `nx_docs` and `nx_available_plugins` tools will be available.

## Available Resources

When connected to an Nx Cloud-enabled workspace, the Nx MCP server automatically exposes recent CI Pipeline Executions (CIPEs) as MCP resources.
Resources appear in your AI tool's resource picker, allowing the LLM to access detailed information about CI runs including failed tasks, terminal output, and affected files.

## Contributing & Development

Contributions are welcome! Please see the [Nx Console contribution guide](https://github.com/nrwl/nx-console/blob/master/CONTRIBUTING.md) for more details.

The basic steps are:

1. Clone the [Nx Console repository](https://github.com/nrwl/nx-console) and follow installation steps
2. Build the `nx-mcp` using `nx run nx-mcp:build` (or `nx run nx-mcp:build:debug` for debugging with source maps)
3. Use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) to test out your changes

## License

[MIT](../../LICENSE)
