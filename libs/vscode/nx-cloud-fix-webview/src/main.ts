import { html, LitElement, TemplateResult, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { CIPEInfo, CIPERunGroup } from '@nx-console/shared-types';
import type { WebviewApi } from 'vscode-webview';
import '@nx-console/shared-ui-components';
import './nx-cloud-fix-component';
import type { NxCloudFixData } from './nx-cloud-fix-component';

export interface NxCloudFixWebviewMessage {
  type: 'apply' | 'reject' | 'webview-ready';
}

@customElement('root-nx-cloud-fix-element')
export class Root extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `;

  constructor() {
    super();
  }

  private vscodeApi: WebviewApi<undefined> = acquireVsCodeApi();

  override connectedCallback() {
    super.connectedCallback();
    // Notify the extension that the webview is ready
    this.vscodeApi.postMessage({ type: 'webview-ready' });
  }

  override render(): TemplateResult {
    return html`
      <nx-cloud-fix-component
        .details=${globalThis.fixDetails as NxCloudFixData}
        .onApply=${() => this.handleApply()}
        .onReject=${() => this.handleReject()}
      ></nx-cloud-fix-component>
    `;
  }

  private handleApply() {
    this.vscodeApi.postMessage({ type: 'apply' });
  }

  private handleReject() {
    this.vscodeApi.postMessage({ type: 'reject' });
  }
}
