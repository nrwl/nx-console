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

```bash
npx nx-mcp /path/to/nx/workspace
```

Refer to your AI tool's documentation for how to register an MCP server. For example, [Cursor](https://docs.cursor.com/context/model-context-protocol) or [Claude Desktop](https://modelcontextprotocol.io/quickstart/user) support MCP.

If you want to host the server instead of communicating via `stdio`, you can use the `--sse` and `--port` flags. Keep in mind that the Nx MCP server only supports a single concurrent connection right now, so connecting multiple clients at the same time might break in some cases.

Run `nx-mcp --help` to see what options are available.

### b) Use the Nx Console extension

If you're using Cursor you can directly install the Nx Console extension which automatically manages the MCP server for you.

More info:

- [Install Nx Console](https://nx.dev/getting-started/editor-setup)
- [Configure Cursor to use the nx-mcp](https://nx.dev/features/enhance-AI#cursor)

## Available Tools

Currently, the Nx MCP server provides a set of tools. Resources, Roots and Prompts aren't supported yet.

- **nx_workspace**: Returns an annotated representation of the local nx configuration and the project graph
- **nx_project_details**: Returns the full project configuration for a specific nx project
- **nx_docs**: Retrieves documentation sections relevant to user queries
- **nx_generators**: Returns a list of available generators in the workspace
- **nx_generator_schema**: Provides detailed schema information for a specific generator
- **nx_available_plugins**: Returns a list of available Nx plugins from the npm registry with their descriptions

When no workspace path is specified, only the `nx_docs` and `nx_available_plugins` tools will be available.

## Contributing & Development

Contributions are welcome! Please see the [Nx Console contribution guide](https://github.com/nrwl/nx-console/blob/master/CONTRIBUTING.md) for more details.

The basic steps are:

1. Clone the [Nx Console repository](https://github.com/nrwl/nx-console) and follow installation steps
2. Build the `nx-mcp` using `nx run nx-mcp:build` (or `nx run nx-mcp:build:debug` for debugging with source maps)
3. Use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) to test out your changes

## License

[MIT](../../LICENSE)
