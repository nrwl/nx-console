import { html, LitElement, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import '@nx-console/shared-ui-components';
import './nx-cloud-fix-component';
import './tailwind.css';
import './intellij-api.d.ts';
import { IdeCommunicationController } from './ide-communication.controller';

@customElement('root-nx-cloud-fix-element')
export class Root extends LitElement {
  private icc: IdeCommunicationController;

  constructor() {
    super();
    this.icc = new IdeCommunicationController(this);
  }

  protected override createRenderRoot(): Element | ShadowRoot {
    return this;
  }

  override render(): TemplateResult {
    return html`
      <nx-cloud-fix-component
        .details=${this.icc.details}
        .onApply=${(_details: any, commitMessage?: string) =>
          this.handleApply(commitMessage)}
        .onApplyLocally=${() => this.handleApplyLocally()}
        .onReject=${() => this.handleReject()}
        .onShowDiff=${() => this.handleShowDiff()}
        .onOpenExternalLink=${(url: string) => this.handleOpenExternalLink(url)}
      ></nx-cloud-fix-component>
    `;
  }

  private handleApply(commitMessage?: string) {
    this.icc.postMessageToIde({ type: 'apply', commitMessage });
  }

  private handleApplyLocally() {
    this.icc.postMessageToIde({ type: 'apply-locally' });
  }

  private handleReject() {
    this.icc.postMessageToIde({ type: 'reject' });
  }

  private handleShowDiff() {
    this.icc.postMessageToIde({ type: 'show-diff' });
  }

  private handleOpenExternalLink(url: string) {
    this.icc.postMessageToIde({ type: 'open-external-link', url });
  }
}
