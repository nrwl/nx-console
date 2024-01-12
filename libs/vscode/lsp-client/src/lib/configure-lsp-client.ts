/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  NxChangeWorkspace,
  NxWorkspaceRefreshNotification,
} from '@nx-console/language-server/types';
import { getWorkspacePath } from '@nx-console/vscode/utils';
import { join } from 'path';
import { ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  NotificationType,
  RequestType,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { handleNxlsRefresh } from './refresh-workspace';

let client: LanguageClient | undefined;

export function configureLspClient(context: ExtensionContext) {
  if (client) {
    sendNotification(NxChangeWorkspace, getWorkspacePath());
    return;
  }

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
      workspacePath: getWorkspacePath(),
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

  // nxls is telling us to refresh projects on this side
  client.onNotification(NxWorkspaceRefreshNotification, () => {
    handleNxlsRefresh();
  });

  context.subscriptions.push({ dispose });
}

function dispose() {
  if (!client) {
    return;
  }

  client.stop();
  client = undefined;
}

export function sendNotification<P>(
  notificationType: NotificationType<P>,
  params?: P
) {
  client!.sendNotification(notificationType, params);
}

export function sendRequest<P, R, E>(
  requestType: RequestType<P, R, E>,
  params: P
) {
  return client!.sendRequest(requestType, params);
}
