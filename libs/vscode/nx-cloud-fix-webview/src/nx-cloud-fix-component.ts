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
        display: block;
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
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .header {
        padding: 20px;
        border-bottom: 1px solid var(--border-color);
        background-color: var(--background-color);
        display: flex;
        align-items: center;
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
        font-size: 1rem;
        color: var(--foreground-color);
        font-weight: 400;
        margin: 0;
      }

      .actions {
        display: flex;
        gap: 12px;
      }

      .main-content {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 24px;
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
        border: 1px solid var(--border-color);
        border-radius: 8px;
        overflow: hidden;
        background-color: var(--background-color);
      }

      .terminal-header {
        padding: 16px 20px;
        background-color: var(--hover-color);
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .terminal-header-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        color: var(--foreground-color);
      }

      terminal-component {
        display: block;
        height: 500px;
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
        gap: 24px;
        margin-top: 8px;
        font-size: 0.875rem;
        color: var(--foreground-color);
      }

      .header-info-item {
        display: flex;
        align-items: center;
        gap: 8px;
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

      @media (max-width: 1024px) {
        .main-content {
          grid-template-columns: 1fr;
        }

        .header {
          flex-direction: column;
          gap: 16px;
          align-items: flex-start;
        }

        .actions {
          align-self: stretch;
        }
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
          <div class="left-column">
            ${this.renderAiFixStatus(aiFix)}
            ${this.renderFailedTasks(runGroup.aiFix.taskIds || [])}
          </div>

          <div class="right-column">
            ${this.getTerminalSection(terminalOutput)}
          </div>
        </div>
      </div>
    `;
  }

  private renderHeader(cipe: CIPEInfo, runGroup: CIPERunGroup): TemplateResult {
    return html`
      <div class="header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="title">Nx Cloud Task Fix</h1>
            <p class="subtitle">Commit: ${cipe.commitTitle || 'N/A'}</p>
            <div class="header-info">
              <div class="header-info-item">
                <span class="header-info-label">Branch:</span>
                <span>${cipe.branch}</span>
              </div>
              <div class="header-info-item">
                <span class="header-info-label">Created:</span>
                <span
                  >${new Date(cipe.createdAt).toLocaleDateString() ||
                  'N/A'}</span
                >
              </div>
            </div>
          </div>
        </div>
        ${this.getActionButtons(runGroup.aiFix)}
      </div>
    `;
  }

  private renderAiFixStatus(aiFix: NxAiFix): TemplateResult {
    const userActionStatusInfo = this.getUserActionStatusInfo(aiFix.userAction);
    const statusInfo = this.getAiFixStatusInfo(aiFix);

    return html`
      <div class="section">
        <div class="section-header">
          <div class="status-icon success">✓</div>
          <h3 class="section-title">AI Fix Status</h3>
        </div>
        <div class="section-content">
          <div class="status-item">
            <span class="status-label">User Action:</span>
            <div class="status-value">
              <span class="status-badge ${userActionStatusInfo.iconClass}">
                ${userActionStatusInfo.title.toLowerCase()}
              </span>
            </div>
          </div>
          <div class="status-item">
            <span class="status-label">Status:</span>
            <div class="status-value">
              <span class="status-badge ${statusInfo.iconClass}">
                ${statusInfo.title.toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getAiFixStatusInfo(aiFix: NxAiFix): {
    title: string;
    iconClass: 'success' | 'error' | 'warning';
  } {
    const hasFix = !!aiFix.suggestedFix;
    const validationStatus = aiFix.validationStatus;

    if (hasFix) {
      switch (validationStatus) {
        case 'NOT_STARTED':
          return {
            title: 'Fix is available, but has not been validated',
            iconClass: 'warning',
          };
        case 'IN_PROGRESS':
          return { title: 'Fix is being validated', iconClass: 'warning' };
        case 'COMPLETED':
          return { title: 'Fix is ready, and validated', iconClass: 'success' };
        case 'FAILED':
          return {
            title: 'Fix is available, but validation failed',
            iconClass: 'error',
          };
      }
    } else {
      // no fix yet - we're still creating it
      switch (validationStatus) {
        case 'NOT_STARTED':
        case 'IN_PROGRESS':
          return {
            title:
              'No suggested fix available - AI fix is still being generated',
            iconClass: 'warning',
          };
        case 'COMPLETED':
        case 'FAILED':
          return {
            title: 'No suggested fix available - AI fix generation failed',
            iconClass: 'error',
          };
      }
    }
  }

  private getUserActionStatusInfo(status: AITaskFixUserAction): {
    emoji: string;
    icon: string;
    iconClass: string;
    title: string;
    description: string;
  } {
    switch (status) {
      case 'APPLIED':
        return {
          emoji: '✅',
          icon: '✓',
          iconClass: 'success',
          title: 'Fix Applied',
          description: 'Nx Cloud has successfully applied this fix',
        };
      case 'REJECTED':
        return {
          emoji: '❌',
          icon: '✗',
          iconClass: 'error',
          title: 'Fix Rejected',
          description: 'This fix has been rejected by the user',
        };
      default:
      case 'NONE':
        return {
          emoji: '⏳',
          icon: '⟳',
          iconClass: 'warning',
          title: 'Waiting to apply or reject this fix',
          description:
            'This fix is available but has not been applied or ignored yet',
        };
    }
  }

  private renderFailedTasks(failedTasks: string[]): TemplateResult {
    return html`
      <div class="section">
        <div class="section-header">
          <div class="status-icon error">✗</div>
          <h3 class="section-title">Failed Tasks (${failedTasks.length})</h3>
        </div>
        <div class="section-content">
          <div class="failed-tasks-list">
            ${failedTasks.length > 0
              ? failedTasks.map(
                  (task) => html`
                    <div class="task-item">
                      <div class="task-info">
                        <div class="task-name">${task}</div>
                      </div>
                    </div>
                  `,
                )
              : html`<div>No failed tasks found</div>`}
          </div>
        </div>
      </div>
    `;
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

  private getTerminalSection(terminalOutput: string): TemplateResult {
    return html`
      <div class="terminal-section">
        <div class="terminal-header">
          <h2 class="terminal-header-title">Terminal Output</h2>
        </div>
        <terminal-component .content="${terminalOutput}"></terminal-component>
      </div>
    `;
  }
}
