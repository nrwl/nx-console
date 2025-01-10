import { html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { MigrateViewData } from '@nx-console/vscode-migrate';
import type { WebviewApi } from 'vscode-webview';

@customElement('root-element')
export class Root extends LitElement {
  @property({ type: String })
  protected state: 'default' | 'update-available' | 'in-progress' = 'default';

  @property({ type: Object })
  protected migrateViewData: MigrateViewData | undefined;

  private vscodeApi: WebviewApi<undefined> = acquireVsCodeApi();

  override render(): TemplateResult {
    if (this.state === 'update-available') {
      return html`
        <p>A newer version of Nx is available to migrate to :)</p>
        <vscode-button
          @click="${() => {
            console.log('clicked');
            this.vscodeApi.postMessage({ type: 'open' });
          }}"
          >Update</vscode-button
        >
      `;
    } else if (this.state === 'in-progress') {
      return html`
        <p>Migration in progress...</p>
        <vscode-button>Open Migrate UI</vscode-button>
      `;
    } else {
      return html` <p>You're up to date!</p> `;
    }
  }
}
