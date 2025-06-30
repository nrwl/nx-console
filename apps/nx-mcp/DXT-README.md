# Nx MCP Server for Claude Desktop

The Nx MCP Server enables Claude Desktop to interact with your Nx workspaces, providing tools for exploring project structure, running generators, executing tasks, and understanding workspace configuration.

## Installation

1. Download the `nx-mcp-*.dxt` file from the [releases page](https://github.com/nrwl/nx-console/releases)
2. Double-click the `.dxt` file to open it with Claude Desktop
3. Click "Install" in the installation dialog
4. (Optional) Configure the workspace path in the extension settings

## Configuration

After installation, you can configure the extension in Claude Desktop:

- **Nx Workspace Path** (optional): Path to your Nx workspace root directory. If not specified, the extension will use the current directory when Claude starts a conversation.

## Available Tools

The extension provides the following tools to Claude:

- **nx_workspace**: Get information about the Nx workspace structure
- **nx_project_details**: Get details about a specific project
- **nx_generators**: List available Nx generators
- **nx_generator_schema**: Get schema for a specific generator
- **nx_open_generate_ui**: Open the Nx generate UI
- **nx_read_generator_log**: Read the generator execution log
- **nx_cloud_cipe_details**: Get Nx Cloud CI Pipeline Execution details
- **nx_cloud_fix_cipe_failure**: Get logs for failed Nx Cloud tasks
- **nx_docs**: Search Nx documentation
- **nx_available_plugins**: List available Nx plugins
- **nx_visualize_graph**: Visualize the Nx project graph

## Usage Examples

Once installed, you can ask Claude to:

- "Show me the structure of my Nx workspace"
- "List all the projects in this monorepo"
- "What generators are available?"
- "Generate a new React library called ui-components"
- "Show me the project graph"
- "What tasks can I run for the api project?"

## Troubleshooting

If you encounter issues:

1. Make sure you have an Nx workspace at the configured path
2. Check that the workspace has a valid `nx.json` file
3. For workspace-specific issues, try running `nx reset` in your workspace

## Support

For issues or feature requests, please visit: https://github.com/nrwl/nx-console/issues