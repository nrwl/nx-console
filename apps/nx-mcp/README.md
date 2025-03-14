# Nx MCP Server

![npm version](https://img.shields.io/npm/v/nx-mcp)

A [Model Context Protocol](https://modelcontextprotocol.io/introduction) server implementation for [Nx](https://nx.dev).

## Overview

The Nx MCP Server provides structured context about your Nx workspace to AI assistant models, enabling them to better understand and interact with your Nx projects. It serves as a bridge between AI models and your Nx workspace and documentation.

## Installation

Simply invoke the MCP server via `npx` or your package manager's equivalent.

```bash
npx nx-mcp /path/to/nx/workspace
```

Refer to your AI tool's documentation for how to register an MCP server. For example, [Cursor](https://docs.cursor.com/context/model-context-protocol) or [Claude Desktop](https://modelcontextprotocol.io/quickstart/user) support MCP.

If you want to host the server instead of communicating via `stdio`, you can use the `--sse` and `--port` flags. Keep in mind that the Nx MCP server only supports a single concurrent connection right now, so connecting multiple clients at the same time might break in some cases.

Run `nx-mcp --help` to see what options are available.

## Available Tools

Currently, the Nx MCP server provides a set of tools. Resources, Roots and Prompts aren't supported yet.

- **nx_workspace**: Returns an annotated representation of the local nx configuration and the project graph
- **nx_project_details**: Returns the full project configuration for a specific nx project
- **nx_docs**: Retrieves documentation sections relevant to user queries
- **nx_generators**: Returns a list of available generators in the workspace
- **nx_generator_schema**: Provides detailed schema information for a specific generator

## Contributing & Development

Contributions are welcome! Please see the [Nx Console contribution guide](https://github.com/nrwl/nx-console/blob/master/CONTRIBUTING.md) for more details.

The basic steps are:

1. Clone the [Nx Console repository](https://github.com/nrwl/nx-console) and follow installation steps
2. Build the `nx-mcp` using `nx run nx-mcp:build` (or `nx run nx-mcp:build:debug` for debugging with source maps)
3. Use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) to test out your changes

## License

[MIT](../../LICENSE)
