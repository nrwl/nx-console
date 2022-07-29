import { join } from 'path';
import { ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function lspClient(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(join('lsp', 'main.js'));

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
    documentSelector: [
      { scheme: 'file', language: 'json', pattern: '**/nx.json' },
      { scheme: 'file', language: 'json', pattern: '**/project.json' },
      { scheme: 'file', language: 'json', pattern: '**/workspace.json' },
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

  context.subscriptions.push({
    dispose() {
      if (!client) {
        return;
      }

      return client.stop();
    },
  });
}
