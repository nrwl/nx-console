import { ExtensionContext, WebviewPanel } from 'vscode';
import { getNxGraphServer, NxGraphServer } from './nx-graph-server';

export class GraphWebviewBase {
  protected graphServer: NxGraphServer;
  constructor(
    protected webviewPanel: WebviewPanel,
    extensionContext: ExtensionContext
  ) {
    this.graphServer = getNxGraphServer(extensionContext);
    this.graphServer.start();
  }
}
