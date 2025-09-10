import yargs, { Argv } from 'yargs';

export interface ArgvType {
  workspacePath?: string;
  transport?: 'stdio' | 'sse' | 'http';
  http: boolean;
  port?: number;
  disableTelemetry: boolean;
  keepAliveInterval: number;
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
    .check((argv) => {
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
