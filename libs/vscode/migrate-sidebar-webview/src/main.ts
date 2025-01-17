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
        ${this.migrateViewData?.hasPendingChanges
          ? html`<p>
              Please commit or stash all changes first before starting a
              migration.
            </p>`
          : ''}
        <div style="display: flex; flex-direction: row; gap: 2px; width: 100%;">
          <vscode-button
            ?disabled="${this.migrateViewData?.hasPendingChanges}"
            @click="${() => {
              this.vscodeApi.postMessage({ type: 'start-migration' });
            }}"
            style="width: 100%; ${this.migrateViewData?.hasPendingChanges
              ? 'cursor: not-allowed;'
              : ''}"
            >Start Migration</vscode-button
          >
          <vscode-button
            icon="edit"
            style="padding-right: 0px; padding-left: 3px; display: flex; ${this
              .migrateViewData?.hasPendingChanges
              ? 'cursor: not-allowed;'
              : ''}"
            ?disabled="${this.migrateViewData?.hasPendingChanges}"
            @click="${() => {
              this.vscodeApi.postMessage({
                type: 'start-migration',
                custom: true,
              });
              this.title = 'Customize Migration';
            }}"
          >
          </vscode-button>
        </div>
      `;
    } else if (this.state === 'in-progress') {
      return html`
        <p>Migration in progress...</p>
        <vscode-button
          @click="${() => this.vscodeApi.postMessage({ type: 'open' })}"
          >Open Migrate UI</vscode-button
        >
      `;
    } else {
      return html` <p>You're up to date!</p> `;
    }
  }
}
