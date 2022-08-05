import { nxWorkspace } from '@nx-console/vscode/nx-workspace';
import { join } from 'path';
import { Disposable, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export async function configureLspClient(
  context: ExtensionContext
): Promise<Disposable> {
  const { workspacePath, workspace } = await nxWorkspace();

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
    ],
    synchronize: {},
  };

  client = new LanguageClient(
    'NxConsole',
    'Nx Console',
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
