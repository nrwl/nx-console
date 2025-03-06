import { Logger } from '@nx-console/shared-utils';
import { getOutputChannel } from '@nx-console/vscode-output-channels';

export const vscodeLogger: Logger = {
  log: (message: string, ...args: any[]) => {
    getOutputChannel().appendLine(
      `[${new Date().toISOString()}] ${message} ${args.join(' ')}`,
    );
  },
};
