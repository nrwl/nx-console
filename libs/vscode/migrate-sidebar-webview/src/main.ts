import { html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { MigrateViewData } from '@nx-console/vscode-migrate';

@customElement('root-element')
export class Root extends LitElement {
  @property({ type: String })
  protected state: 'default' | 'update-available' | 'in-progress' = 'default';

  @property({ type: Object })
  protected migrateViewData: MigrateViewData | undefined;

  override render(): TemplateResult {
    return html`
      <h2>${this.state}</h2>
      <pre>${JSON.stringify(this.migrateViewData, null, 2)}</pre>
      <vscode-icon name="account"></vscode-icon>
    `;
  }
}
