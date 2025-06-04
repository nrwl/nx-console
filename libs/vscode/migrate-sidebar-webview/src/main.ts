import { html, LitElement, TemplateResult, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { MigrateViewData } from '@nx-console/shared-types';
import type { WebviewApi } from 'vscode-webview';

@customElement('root-element')
export class Root extends LitElement {
  static override styles = css`
    a {
      color: var(--vscode-textLink-foreground);
    }
    a:hover {
      color: var(--vscode-textLink-activeForeground);
    }
  `;

  @property({ converter: (value) => JSON.parse(value) })
  protected state:
    | 'default'
    | 'update-available'
    | { 'in-progress': 'default' | 'pending-package-updates' } = 'default';

  @property({ type: Object })
  protected migrateViewData: MigrateViewData | undefined;

  private vscodeApi: WebviewApi<undefined> = acquireVsCodeApi();

  override render(): TemplateResult {
    if (this.state === 'update-available') {
      return html`
        <p>
          A newer version of Nx is available:
          ${this.migrateViewData?.latestNxVersion.full} <br />
          Use the button below to start a guided migration using the Migrate UI.
          <a href="https://nx.dev/latest/react/cli/migrate">Learn more</a>
        </p>

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
            secondary
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
    } else if (this.state === 'default') {
      return html` <p>You're on the latest Nx version.</p> `;
    } else if (this.state['in-progress'] === 'default') {
      return html`
        <p>Migration in progress. Continue in the Migrate UI.</p>
        <vscode-button
          @click="${() => this.vscodeApi.postMessage({ type: 'open' })}"
          >Open Migrate UI</vscode-button
        >
      `;
    } else if (this.state['in-progress'] === 'pending-package-updates') {
      console.log('pending-package-updates');

      return html`<p>
          Updates were made to package.json. Please review them and confirm the
          changes.
        </p>
        <div style="display: flex; padding-bottom: 0.5rem;">
          <vscode-button
            secondary
            style="width: 100%"
            @click="${() => this.vscodeApi.postMessage({ type: 'view-diff' })}"
            >View package.json changes</vscode-button
          >
        </div>
        <p>
          If the changes look good, then confirm to update packages and continue
          the migration.
        </p>
        <div style="display: flex; flex-direction: row; gap: 2px; width: 100%;">
          <vscode-button
            secondary
            icon="close"
            style="flex-grow: 1;"
            @click="${() =>
              this.vscodeApi.postMessage({ type: 'cancel-migration' })}"
            >Cancel</vscode-button
          >
          <vscode-button
            icon="check"
            style="flex-grow: 1;"
            @click="${() =>
              this.vscodeApi.postMessage({ type: 'confirm-changes' })}"
            >Yes, continue</vscode-button
          >
        </div> `;
    }
  }
}
