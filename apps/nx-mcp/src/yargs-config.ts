import yargs, { Argv } from 'yargs';

export interface ArgvType {
  workspacePath?: string;
  transport?: 'stdio' | 'sse' | 'http';
  sse: boolean;
  http: boolean;
  port?: number;
  disableTelemetry: boolean;
  keepAliveInterval: number;
  debugLogs: boolean;
  tools?: string | string[];
  minimal: boolean;
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
      choices: ['stdio', 'sse', 'http'] as const,
      default: 'stdio',
      type: 'string',
    })
    .option('sse', {
      describe:
        'Configure the server to use SSE (Server-Sent Events) [DEPRECATED: Use --transport sse instead]',
      type: 'boolean',
      default: false,
      deprecated: true,
      hidden: true,
    })
    .option('port', {
      alias: 'p',
      describe: 'Port to use for the HTTP/SSE server (default: 9921)',
      type: 'number',
    })
    .option('disableTelemetry', {
      describe: 'Disable sending of telemetry data',
      type: 'boolean',
      default: false,
    })
    .option('keepAliveInterval', {
      describe:
        'Interval in milliseconds to send SSE keep-alive messages (default: 30000, 0 to disable)',
      type: 'number',
      deprecated: true,
      hidden: true,
      default: 30000,
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
    .option('minimal', {
      describe:
        'Hide workspace analysis tools (nx_available_plugins, nx_workspace_path, nx_workspace, nx_project_details, nx_generators, nx_generator_schema)',
      type: 'boolean',
      default: false,
    })
    .check((argv) => {
      // Check for conflicting options
      if (argv.sse && argv.transport === 'http') {
        throw new Error('Cannot use both sse and http transport together');
      }
      // Handle backward compatibility
      if (argv.sse) {
        console.warn(
          'Warning: --sse option is deprecated. Please use --transport sse instead.',
        );
        if (!argv.transport || argv.transport === 'stdio') {
          argv.transport = 'sse';
        }
      }

      // Validate port usage
      if (argv.port !== undefined && argv.transport === 'stdio') {
        throw new Error(
          'The --port option can only be used when transport is set to sse or http',
        );
      }

      return true;
    })
    .help();
}
