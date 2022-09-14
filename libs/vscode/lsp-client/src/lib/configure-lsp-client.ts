import { getWorkspacePath, outputLogger } from '@nx-console/vscode/utils';
import { nxWorkspace } from '@nx-console/shared/workspace';
import { join } from 'path';
import { Disposable, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  NotificationType,
  ProtocolNotificationType,
  RequestType,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export async function configureLspClient(
  context: ExtensionContext
): Promise<Disposable> {
  const { workspacePath, workspace } = await nxWorkspace(
    getWorkspacePath(),
    outputLogger
  );

  const serverModule = context.asAbsolutePath(join('nxls', 'main.js'));

  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },

    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    initializationOptions: {
      workspacePath,
      projects: workspace.projects,
    },
    documentSelector: [
      { scheme: 'file', language: 'json', pattern: '**/nx.json' },
      { scheme: 'file', language: 'json', pattern: '**/project.json' },
      { scheme: 'file', language: 'json', pattern: '**/workspace.json' },
      { scheme: 'file', language: 'json', pattern: '**/package.json' },
    ],
    synchronize: {},
  };

  client = new LanguageClient(
    'NxConsoleClient',
    'Nx Console Client',
    serverOptions,
    clientOptions
  );

  client.start();

  return {
    dispose() {
      if (!client) {
        return;
      }

      return client.stop();
    },
  };
}

export function sendNotification<P>(notificationType: NotificationType<P>) {
  client.sendNotification(notificationType);
}
