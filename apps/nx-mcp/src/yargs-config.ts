import yargs, { Argv } from 'yargs';
import { NxMcpConfig } from '@nx-console/nx-mcp-server';

export interface ArgvType extends NxMcpConfig {
  workspacePath?: string;
  // Removed options, kept only to explain the removal
  sse: boolean;
  http: boolean;
  // Yargs internals
  _: (string | number)[];
  $0: string;
  [x: string]: unknown;
}

export function createYargsConfig(args: string[]): Argv<any> {
  return yargs(args)
    .command('$0 [workspacePath]', 'Start the nx-mcp server', (yargs) => {
      yargs.positional('workspacePath', {
        describe:
          'Path to the Nx workspace root. Will default to the current cwd if not provided.',
        type: 'string',
      });
    })
    .option('workspacePath', {
      alias: 'w',
      describe: 'Path to the Nx workspace root',
      type: 'string',
    })
    .option('transport', {
      describe: 'Transport protocol to use',
      choices: ['stdio', 'http'] as const,
      default: 'stdio',
      type: 'string',
    })
    .option('sse', {
      describe: 'Removed: use --transport http',
      type: 'boolean',
      default: false,
      hidden: true,
    })
    .option('port', {
      alias: 'p',
      describe: 'Port to use for the HTTP server (default: 9921)',
      type: 'number',
    })
    .option('disableTelemetry', {
      describe: 'Disable sending of telemetry data',
      type: 'boolean',
      default: false,
    })
    .option('debugLogs', {
      describe: 'Enable debug logging',
      type: 'boolean',
      default: false,
    })
    .option('tools', {
      alias: 't',
      describe:
        'Filter which tools are enabled. Accepts glob patterns including negation (e.g., "*", "!nx_docs", "cloud_*")',
      type: 'array',
      string: true,
    })
    .coerce('tools', (val: string | string[] | undefined) => {
      if (val === undefined) return undefined;
      return Array.isArray(val) ? val : [val];
    })
    .option('minimal', {
      describe:
        'Hide workspace analysis tools (nx_available_plugins, nx_workspace_path, nx_workspace, nx_project_details, nx_generators, nx_generator_schema)',
      type: 'boolean',
      default: true,
    })
    .check((argv) => {
      if (argv.sse) {
        throw new Error(
          'The SSE transport has been removed. Use --transport http and connect to http://localhost:<port>/mcp instead.',
        );
      }

      // Validate port usage
      if (argv.port !== undefined && argv.transport === 'stdio') {
        throw new Error(
          'The --port option can only be used when transport is set to http',
        );
      }

      return true;
    })
    .help();
}
