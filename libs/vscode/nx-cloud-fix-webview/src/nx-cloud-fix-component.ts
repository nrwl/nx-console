import { html, LitElement, TemplateResult, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type {
  AITaskFixUserAction,
  CIPEInfo,
  CIPERun,
  CIPERunGroup,
  NxAiFix,
} from '@nx-console/shared-types';
import { ContextProvider } from '@lit-labs/context';
import {
  editorContext,
  getVscodeStyleMappings,
} from '@nx-console/shared-ui-components';
import './terminal-component';

export interface NxCloudFixWebviewMessage {
  type: 'apply' | 'ignore' | 'webview-ready';
}

export type NxCloudFixData = {
  cipe: CIPEInfo;
  runGroup: CIPERunGroup;
  terminalOutput?: string;
};

@customElement('nx-cloud-fix-component')
export class NxCloudFixComponent extends LitElement {
  constructor() {
    super();
    new ContextProvider(this, {
      context: editorContext,
      initialValue: 'vscode',
    });
  }

  static override styles = [
    getVscodeStyleMappings(),
    css`
      :host {
        display: flex;
        height: 100vh;
        --foreground-color: var(--vscode-editor-foreground);
        --background-color: var(--vscode-editor-background);
        --border-color: var(--vscode-panel-border, #2d2d30);
        --hover-color: var(--vscode-list-hoverBackground, #2a2d2e);
        --success-color: var(--vscode-testing-iconPassed, #73c991);
        --error-color: var(--vscode-errorForeground, #f14c4c);
        --warning-color: var(--vscode-editorWarning-foreground, #ffcc02);
        --badge-background: var(--vscode-badge-background, #4d4d4d);
        --badge-foreground: var(--vscode-badge-foreground, #ffffff);
        --primary-color: var(--vscode-button-background, #0e639c);
        --secondary-color: var(--vscode-button-secondaryBackground, #3a3d41);
        color: var(--foreground-color);
        background-color: var(--background-color);
        font-family: var(
          --vscode-font-family,
          'Segoe UI',
          Tahoma,
          Geneva,
          Verdana,
          sans-serif
        );
        font-size: var(--vscode-font-size, 13px);
      }

      .container {
        margin: 0 auto;
        min-height: 100vh;
        max-width: 100vw;
        display: flex;
        flex-direction: column;
      }

      .header {
        padding: 12px;
        margin: 0 12px;
        background-color: var(--background-color);
        display: flex;
        justify-content: space-between;
      }

      .header-content {
        display: flex;
        flex-direction: column;
      }

      .title-section {
        display: flex;
        flex-direction: column;
      }

      .title {
        font-size: 1.5rem;
        margin: 0 0 8px 0;
        font-weight: 600;
        color: var(--foreground-color);
      }

      .subtitle {
        font-size: 0.8rem;
        color: var(--foreground-color);
        font-weight: 400;
        margin: 10px 0;
      }

      .actions {
        display: flex;
        gap: 8px;
      }

      .main-content {
        display: flex;
        min-height: 0;
        flex: 1 1 100%;
      }

      .left-column {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .right-column {
        display: flex;
        flex-direction: column;
      }

      .status-card {
        padding: 20px;
        border-radius: 8px;
        background-color: var(--background-color);
      }

      .status-card-header {
        display: none;
      }

      .status-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .status-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }

      .status-icon.success {
        background-color: rgba(115, 201, 145, 0.1);
        color: var(--success-color);
      }

      .status-icon.error {
        background-color: rgba(241, 76, 76, 0.1);
        color: var(--error-color);
      }

      .status-icon.warning {
        background-color: rgba(255, 204, 2, 0.1);
        color: var(--warning-color);
      }

      .status-text {
        display: flex;
        flex-direction: column;
      }

      .status-text-main {
        font-weight: 600;
        font-size: 0.875rem;
        margin: 0 0 2px 0;
      }

      .status-text-sub {
        font-size: 0.75rem;
        opacity: 0.7;
        margin: 0;
      }

      .validation-badge {
        padding: 12px 16px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background-color: var(--background-color);
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .validation-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .validation-icon.success {
        background-color: rgba(115, 201, 145, 0.1);
        color: var(--success-color);
      }

      .validation-icon.error {
        background-color: rgba(241, 76, 76, 0.1);
        color: var(--error-color);
      }

      .validation-icon.warning {
        background-color: rgba(255, 204, 2, 0.1);
        color: var(--warning-color);
      }

      .info-message {
        padding: 16px;
        background-color: rgba(14, 99, 156, 0.1);
        border: 1px solid rgba(14, 99, 156, 0.3);
        border-radius: 8px;
        font-size: 0.875rem;
      }

      .terminal-section {
        overflow: hidden;
        flex: 1;
        background-color: var(--background-color);
      }

      .terminal-header {
        padding: 6px 21px;
        background-color: var(--hover-color);
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .terminal-header-title {
        font-size: 0.9rem;
        font-weight: 300;
        margin: 0;
        color: var(--foreground-color);
        font-family: var(
          --vscode-editor-font-family,
          'Menlo',
          'Monaco',
          'Courier New',
          monospace
        );
      }

      terminal-component {
        display: block;
        height: 100%;
      }

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
        font-size: 1.2rem;
        color: var(--foreground-color);
      }

      .header-info {
        display: flex;
        align-items: center;
        margin-top: 8px;
        font-size: 0.875rem;
        color: var(--foreground-color);
      }

      .header-info-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .header-info-label {
        opacity: 0.7;
      }

      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .status-badge.failed {
        background-color: rgba(241, 76, 76, 0.1);
        color: var(--error-color);
      }

      .section {
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background-color: var(--background-color);
      }

      .section-header {
        padding: 16px 16px 0px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .section-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .section-content {
        padding: 16px 20px;
      }

      .status-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .status-item:last-child {
        margin-bottom: 0;
      }

      .status-label {
        font-weight: 500;
        font-size: 0.875rem;
      }

      .status-value {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .status-badge.success {
        background-color: rgba(115, 201, 145, 0.1);
        color: var(--success-color);
      }

      .status-badge.warning {
        background-color: rgba(255, 204, 2, 0.1);
        color: var(--warning-color);
      }

      .status-badge.error {
        background-color: rgba(241, 76, 76, 0.1);
        color: var(--error-color);
      }

      .failed-tasks-list {
        margin-top: 0;
      }

      .task-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        margin-bottom: 4px;
      }

      .task-item:last-child {
        margin-bottom: 0;
      }

      .task-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .task-name {
        font-weight: 500;
        font-size: 0.875rem;
      }

      .task-status {
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.75rem;
        font-weight: 500;
        background-color: var(--badge-background);
        color: var(--badge-foreground);
      }

      .expandable-header {
        cursor: pointer;
        user-select: none;
      }

      .expand-icon {
        transition: transform 0.2s;
      }

      .expand-icon.expanded {
        transform: rotate(90deg);
      }
    `,
  ];

  @property({ type: Object })
  details: NxCloudFixData | undefined;

  @property({ type: Function })
  onApply: ((details: NxCloudFixData) => void) | undefined;

  @property({ type: Function })
  onReject: ((details: NxCloudFixData) => void) | undefined;

  override render(): TemplateResult {
    if (!this.details) {
      return html`<div class="loading">Loading...</div>`;
    }

    const { cipe, runGroup, terminalOutput } = this.details;
    const aiFix = runGroup.aiFix;

    if (!aiFix) {
      return html`<div class="container">No AI fix available</div>`;
    }

    return html`
      <div class="container">
        ${this.renderHeader(cipe, runGroup)}

        <div class="main-content">
          ${this.getTerminalSection(aiFix.taskIds[0], terminalOutput)}
        </div>
      </div>
    `;
  }

  private renderHeader(cipe: CIPEInfo, runGroup: CIPERunGroup): TemplateResult {
    return html`
      <div class="header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="title">
              ${runGroup.aiFix.suggestedFixDescription ||
              'Nx Cloud suggested fix'}
              <p class="subtitle">
                Nx Cloud automatically generates a fix for this error.
              </p>
            </h1>
            <div class="header-info">
              <div class="header-info-item">
                <span class="header-info-label">
                  <pill-element>
                    <icon-element icon="git-branch"></icon-element>
                    <a href="${cipe.commitUrl}" target="_blank">
                      ${cipe.branch}
                    </a>
                  </pill-element>
                </span>
              </div>
              <div class="header-info-item">
                <span class="header-info-label">
                  ${this.getAiFixStatusInfo(runGroup.aiFix, cipe.branch)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div>${this.getActionButtons(runGroup.aiFix)}</div>
      </div>
    `;
  }

  private getAiFixStatusInfo(aiFix: NxAiFix, branch: string): TemplateResult {
    const hasFix = !!aiFix.suggestedFix;
    const validationStatus = aiFix.validationStatus;

    if (hasFix) {
      switch (validationStatus) {
        case 'NOT_STARTED':
          return html`<pill-element type="info">
            <icon-element icon="sync"></icon-element>
            <span>Fix available</span>
          </pill-element>`;
        case 'IN_PROGRESS':
          return html`<pill-element type="info">
            <icon-element icon="loading~spin"></icon-element>
            <span>Validating fix...</span>
          </pill-element>`;
        case 'COMPLETED':
          return html`<pill-element type="success">
            <icon-element icon="check"></icon-element>
            <span>Validated Fix</span>
          </pill-element>`;
        case 'FAILED':
          return html`<pill-element type="error">
            <icon-element icon="error"></icon-element>
            <span>Validation Failed</span>
          </pill-element>`;
      }
    } else {
      // no fix yet - we're still creating it
      switch (validationStatus) {
        case 'NOT_STARTED':
        case 'IN_PROGRESS':
          return html`<pill-element type="info">
            <icon-element icon="sync~spin"></icon-element>
            <span>Generating fix...</span>
          </pill-element>`;
        case 'COMPLETED':
        case 'FAILED':
          return html`<pill-element type="error">
            <icon-element icon="error"></icon-element>
            <span>Fix generation failed</span>
          </pill-element>`;
      }
    }
  }

  private getActionButtons(aiFix: NxAiFix): TemplateResult {
    if (aiFix.userAction === 'APPLIED' || aiFix.userAction === 'REJECTED') {
      return html``;
    }

    if (!aiFix.suggestedFix) {
      return html``;
    }

    return html`
      <div class="actions">
        <button-element
          text="Apply Fix"
          appearance="primary"
          @click="${() => this.handleApply()}"
        ></button-element>
        <button-element
          text="Reject Fix"
          appearance="secondary"
          @click="${() => this.handleReject()}"
        ></button-element>
      </div>
    `;
  }

  private handleApply() {
    if (this.details && this.onApply) {
      this.onApply(this.details);
    }
  }

  private handleReject() {
    if (this.details && this.onReject) {
      this.onReject(this.details);
    }
  }

  private getTerminalSection(
    taskId: string,
    terminalOutput: string,
  ): TemplateResult {
    return html`
      <div class="terminal-section">
        <div class="terminal-header">
          <!-- <div class="status-icon error">x</div> -->
          <h2 class="terminal-header-title">$> nx run ${taskId}</h2>
        </div>
        <terminal-component .content="${terminalOutput}"></terminal-component>
      </div>
    `;
  }
}

@customElement('pill-element')
class PillElement extends LitElement {
  static override styles = [
    css`
      :host {
        background-color: var(--badge-background);
        color: var(--badge-foreground);
        font-size: 0.75rem;
        font-weight: 500;
        box-sizing: border-box;
        border-radius: 18px;
        padding: 4px 12px;
        margin-right: 10px;
        font-weight: 600;
        display: flex;
      }

      .pill-content {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 4px;
      }

      :host(.success) {
        background-color: rgba(115, 201, 145, 0.1);
        color: var(--success-color);
      }

      :host(.warning) {
        background-color: rgba(255, 204, 2, 0.1);
        color: var(--warning-color);
      }

      :host(.error) {
        background-color: rgba(241, 76, 76, 0.1);
        color: var(--error-color);
      }

      :host(.info) {
        background-color: rgba(14, 99, 156, 0.1);
        color: var(--primary-color);
      }
    `,
  ];

  constructor() {
    super();
    const codiconsLink = document.createElement('link');
    codiconsLink.rel = 'stylesheet';
    codiconsLink.href =
      'https://unpkg.com/@vscode/codicons@0.0.36/dist/codicon.css';
    this.appendChild(codiconsLink);
  }

  @property({ type: String }) text;
  @property({ type: String }) type = 'info';

  override render(): TemplateResult {
    if (!this.text) {
      return html`<div class="pill-content"><slot></slot></div>`; // Return nothing if no text is provided
    }
    return html`<span>${this.text}</span>`;
  }

  override updated() {
    // Clear existing state classes
    this.classList.remove('success', 'warning', 'error', 'info');

    // Add class based on variant if it's one of the supported types
    if (['success', 'warning', 'error', 'info'].includes(this.type)) {
      this.classList.add(this.type);
    }
  }
}
