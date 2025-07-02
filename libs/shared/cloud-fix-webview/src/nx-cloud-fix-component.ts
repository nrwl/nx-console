import { ContextProvider } from '@lit-labs/context';
import type { CIPEInfo, CIPERunGroup, NxAiFix } from '@nx-console/shared-types';
import {
  editorContext,
  getVscodeStyleMappings,
} from '@nx-console/shared-ui-components';
import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './terminal-component';

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

    // Add codicons CSS
    if (!document.querySelector('link[href*="codicon.css"]')) {
      const codiconsLink = document.createElement('link');
      codiconsLink.rel = 'stylesheet';
      codiconsLink.href =
        'https://unpkg.com/@vscode/codicons@0.0.36/dist/codicon.css';
      document.head.appendChild(codiconsLink);
    }
  }

  static override styles = [
    getVscodeStyleMappings(),
    css`
      :host {
        display: block;
        min-height: 100vh;
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
        overflow-y: auto;
      }

      .container {
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        padding-bottom: 24px;
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
        width: 100%;
      }

      .title-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }

      .title {
        font-size: 1.5rem;
        margin: 0;
        font-weight: 600;
        color: var(--foreground-color);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .title svg {
        width: 24px;
        height: 24px;
        stroke: var(--foreground-color);
        fill: transparent;
        flex-shrink: 0;
      }

      .cipe-link {
        cursor: pointer;
        color: var(--vscode-button-primaryForeground);
      }

      .branch-badge {
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        padding: 8px 16px;
        border-radius: 18px;
        font-size: 0.875rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .branch-badge a {
        color: inherit;
        text-decoration: none;
      }

      .branch-badge a:hover {
        text-decoration: underline;
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
        flex-direction: column;
        padding: 0 12px;
      }

      .explanation-section {
        padding: 8px 12px 36px;
        margin: 0;
      }

      .explanation-text {
        line-height: 1.6;
        color: var(--foreground-color);
        opacity: 0.9;
        margin: 0;
      }

      .diff-link {
        color: var(--vscode-textLink-foreground, #0066bf);
        cursor: pointer;
        text-decoration: underline;
      }

      .diff-link:hover {
        color: var(--vscode-textLink-activeForeground, #0066bf);
        text-decoration: underline;
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

      .verification-badge {
        padding: 12px 16px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background-color: var(--background-color);
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .verification-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .verification-icon.success {
        background-color: rgba(115, 201, 145, 0.1);
        color: var(--success-color);
      }

      .verification-icon.error {
        background-color: rgba(241, 76, 76, 0.1);
        color: var(--error-color);
      }

      .verification-icon.warning {
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
        background-color: var(--background-color);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        margin: 0;
        position: relative;
      }

      .terminal-section.section {
        border: 1px solid var(--border-color);
        border-radius: 0;
      }

      .terminal-section .section-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding-top: 0;
        padding-left: 0;
        padding-right: 20px;
        padding-bottom: 20px;
        min-height: 300px;
        height: 400px;
      }

      .terminal-section terminal-component {
        flex: 1;
        display: block;
        position: relative;
      }

      /* Ensure xterm scrollbar is visible */
      .terminal-section .xterm .xterm-viewport {
        scrollbar-width: thin;
        scrollbar-color: var(--vscode-scrollbarSlider-background)
          var(--vscode-scrollbar-shadow);
      }

      .terminal-section .xterm .xterm-viewport::-webkit-scrollbar {
        width: 14px;
      }

      .terminal-section .xterm .xterm-viewport::-webkit-scrollbar-track {
        background: transparent;
      }

      .terminal-section .xterm .xterm-viewport::-webkit-scrollbar-thumb {
        background-color: var(--vscode-scrollbarSlider-background);
        border-radius: 10px;
        border: 3px solid transparent;
        background-clip: content-box;
      }

      .terminal-section .xterm .xterm-viewport::-webkit-scrollbar-thumb:hover {
        background-color: var(--vscode-scrollbarSlider-hoverBackground);
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

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
        font-size: 1.2rem;
        color: var(--foreground-color);
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
        border-radius: 0;
        background-color: var(--background-color);
      }

      .section-header {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .terminal-section .section-header {
        border-bottom: 1px solid transparent;
        transition: border-color 0.2s;
      }

      .terminal-section.expanded .section-header {
        border-bottom-color: var(--border-color);
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
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .fix-section {
        border: 1px solid var(--border-color);
        background-color: var(--background-color);
        margin: 0;
        position: relative;
      }

      /* No arrows on fix-section - it's the top element */

      .fix-section-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        position: relative;
      }

      .fix-section-header #verification-status-badge {
        position: absolute;
        right: 8px;
        top: 14px;
      }

      .fix-section-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .fix-section-description {
        font-size: 0.875rem;
        color: var(--foreground-color);
        opacity: 0.8;
        margin: 0;
      }

      .fix-section-content {
        padding: 4px 16px 16px;
      }

      .fix-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }

      vscode-textarea {
        width: 100%;
        margin-bottom: 16px;
      }

      .fix-header-left {
        flex: 1;
      }

      .creating-fix-section {
        border: 1px solid var(--border-color);
        background-color: var(--background-color);
        margin: 0;
        padding: 24px;
        text-align: center;
        position: relative;
      }

      /* Arrow between boxes */
      .arrow-container {
        height: 36px;
        position: relative;
        margin: 0;
        pointer-events: none;
      }

      .arrow-line {
        position: absolute;
        left: 50%;
        top: 0;
        transform: translateX(-50%);
        width: 2px;
        height: 100%;
        background-color: var(--border-color);
      }

      .arrow-head {
        position: absolute;
        left: 50%;
        top: 0px;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 10px solid var(--border-color);
      }

      .creating-fix-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .creating-fix-icon svg {
        width: 100%;
        height: 100%;
        stroke: var(--primary-color);
      }

      .creating-fix-icon .codicon {
        font-size: 64px !important;
        line-height: 1;
      }

      .creating-fix-title {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 8px 0;
        color: var(--foreground-color);
      }

      .creating-fix-description {
        font-size: 0.875rem;
        color: var(--foreground-color);
        opacity: 0.8;
        margin: 0;
      }

      .loading-dots {
        width: 24px;
        text-align: left;
        display: inline-block;
      }

      .loading-dots::after {
        content: '';
        animation: loading-dots 1.5s steps(4, end) infinite;
      }

      @keyframes loading-dots {
        0%,
        20% {
          content: '';
        }
        40% {
          content: '.';
        }
        60% {
          content: '..';
        }
        80%,
        100% {
          content: '...';
        }
      }

      /* Spinning animation for loading icon */
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .codicon-modifier-spin {
        animation: spin 2s linear infinite;
      }

      .task-id {
        font-family: monospace;
      }
    `,
  ];

  @property({ type: Object })
  details: NxCloudFixData | undefined;

  @property({ type: Function })
  onApply: ((details: NxCloudFixData) => void) | undefined;

  @property({ type: Function })
  onReject: ((details: NxCloudFixData) => void) | undefined;

  @property({ type: Function })
  onApplyLocally: ((details: NxCloudFixData) => void) | undefined;

  @property({ type: Function })
  onShowDiff: (() => void) | undefined;

  @state()
  private isTerminalExpanded = true;

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
          <div class="explanation-section">
            <p class="explanation-text">
              Nx Cloud AI analyzes your failing CI tasks and automatically
              generates fixes whenever possible. The AI examines the error
              output, identifies the root cause, and suggests minimal code
              changes to resolve the issue. Once generated, the fix is verified
              by running the same task on Nx Cloud to ensure it resolves the
              error.
            </p>
            <p class="explanation-text" style="margin-top: 8px;">
              You can
              <span class="diff-link" @click="${() => this.handleShowDiff()}">
                review the resulting git diff of the suggested changes</span
              >&nbsp;and choose to apply or reject them.
            </p>
          </div>
          ${aiFix.suggestedFix ? this.getFixSection(aiFix) : ''}
          ${aiFix.suggestedFix
            ? html`<div class="arrow-container">
                <div class="arrow-line"></div>
                <div class="arrow-head"></div>
              </div>`
            : ''}
          ${this.getStatusSection(aiFix)}
          <div class="arrow-container">
            <div class="arrow-line"></div>
            <div class="arrow-head"></div>
          </div>
          ${this.getTerminalSection(aiFix.taskIds[0], terminalOutput)}
        </div>

        <!-- Hidden pill-element to ensure Codicons CSS is loaded -->
        <pill-element style="display: none"></pill-element>
      </div>
    `;
  }

  private renderHeader(cipe: CIPEInfo, runGroup: CIPERunGroup): TemplateResult {
    return html`
      <div class="header">
        <div class="header-content">
          <div class="title-section">
            <h1 class="title">
              <svg
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                fill="transparent"
                viewBox="0 0 24 24"
                id="nx-cloud-header-logo"
              >
                <path
                  d="M22.167 7.167v-2.5a2.5 2.5 0 0 0-2.5-2.5h-15a2.5 2.5 0 0 0-2.5 2.5v15a2.5 2.5 0 0 0 2.5 2.5h2.5m15-15c-2.76 0-5 2.24-5 5s-2.24 5-5 5-5 2.24-5 5m15-15V19.59a2.577 2.577 0 0 1-2.576 2.576H7.167"
                  stroke-width="2"
                ></path>
              </svg>
              Nx Cloud AI Fix
              <a
                class="cipe-link"
                target="_blank"
                href="${cipe.cipeUrl}"
                title="View CI Pipeline Execution"
              >
                <icon-element icon="link-external"></icon-element>
              </a>
            </h1>
            <div class="branch-badge">
              <icon-element icon="git-branch"></icon-element>
              <a href="${cipe.commitUrl}" target="_blank"> ${cipe.branch} </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private handleApply() {
    if (this.details && this.onApply) {
      this.onApply(this.details);
    }
  }

  private handleApplyLocally() {
    if (this.details && this.onApplyLocally) {
      this.onApplyLocally(this.details);
    }
  }

  private handleReject() {
    if (this.details && this.onReject) {
      this.onReject(this.details);
    }
  }

  private handleShowDiff() {
    if (this.onShowDiff) {
      this.onShowDiff();
    }
  }

  private getTerminalSection(
    taskId: string,
    terminalOutput: string,
  ): TemplateResult {
    return html`
      <div
        class="terminal-section section ${this.isTerminalExpanded
          ? 'expanded'
          : ''}"
      >
        <div
          class="section-header expandable-header"
          @click="${() => (this.isTerminalExpanded = !this.isTerminalExpanded)}"
        >
          <icon-element
            icon="${this.isTerminalExpanded ? 'chevron-down' : 'chevron-right'}"
            class="expand-icon"
          ></icon-element>
          <h2 class="section-title">
            Original failing task output:
            <span class="task-id">nx run ${taskId}</span>
          </h2>
        </div>
        ${this.isTerminalExpanded
          ? html`
              <div class="section-content">
                <terminal-component
                  .content="${terminalOutput}"
                ></terminal-component>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private getCreatingFixSection(): TemplateResult {
    return html`
      <div class="creating-fix-section">
        <div class="creating-fix-icon">
          <i class="codicon codicon-loading codicon-modifier-spin"></i>
        </div>
        <h2 class="creating-fix-title">
          Creating Fix<span class="loading-dots"></span>
        </h2>
        <p class="creating-fix-description">
          Nx Cloud AI is analyzing the error and generating a fix.
        </p>
      </div>
    `;
  }

  private getFixSection(aiFix: NxAiFix): TemplateResult {
    // If fix was rejected, show the rejected state
    if (aiFix.userAction === 'REJECTED') {
      return html`
        <div class="creating-fix-section">
          <div class="creating-fix-icon">
            <i
              class="codicon codicon-circle-slash"
              style="color: var(--foreground-color); opacity: 0.7;"
            ></i>
          </div>
          <h2 class="creating-fix-title">Fix Rejected</h2>
          <p class="creating-fix-description">
            You chose not to apply the suggested fix.
          </p>
        </div>
      `;
    }

    // If fix was applied, show the applied state
    if (aiFix.userAction === 'APPLIED') {
      return html`
        <div class="creating-fix-section">
          <div class="creating-fix-icon">
            <i
              class="codicon codicon-git-branch"
              style="color: var(--success-color);"
            ></i>
          </div>
          <h2 class="creating-fix-title">Fix Applied</h2>
          <p class="creating-fix-description">
            The suggested fix has been committed to your branch.
          </p>
        </div>
      `;
    }

    const showActions = true;

    return html`
      <div class="fix-section">
        <div class="fix-section-header">
          <div class="fix-header-left">
            <h2 class="fix-section-title">
              <icon-element icon="sparkle"></icon-element>
              Apply Suggested Fix
            </h2>
          </div>
        </div>
        <div class="fix-section-content">
          <vscode-form-group variant="vertical">
            <vscode-label for="commit-message">Commit message</vscode-label>
            <vscode-textarea
              value="${aiFix.suggestedFixDescription ||
              'fix: nx cloud AI suggested fix'}"
              disabled
              rows="3"
            ></vscode-textarea>
          </vscode-form-group>
          ${showActions
            ? html`
                <div class="fix-actions">
                  <button-element
                    text="Apply Fix"
                    appearance="primary"
                    @click="${() => this.handleApply()}"
                  ></button-element>
                  <button-element
                    text="Apply Fix Locally"
                    appearance="secondary"
                    @click="${() => this.handleApplyLocally()}"
                  ></button-element>
                  <button-element
                    text="Reject"
                    appearance="secondary"
                    @click="${() => this.handleReject()}"
                  ></button-element>
                </div>
              `
            : ''}
        </div>
      </div>
    `;
  }

  private getStatusSection(aiFix: NxAiFix): TemplateResult {
    const hasAiFix = !!aiFix.suggestedFix;
    // TODO: Remove this once all environments have been migrated after deployment
    // Fall back to original validationStatus field for backwards compatibility
    const verificationStatus =
      aiFix.verificationStatus || (aiFix as any).validationStatus;

    if (!hasAiFix && verificationStatus === 'NOT_STARTED') {
      // Show creating fix state
      return this.getCreatingFixSection();
    }

    // if the fix creation failed, show the proper error state
    if (!hasAiFix && verificationStatus === 'FAILED') {
      return html`
        <div class="creating-fix-section">
          <div class="creating-fix-icon">
            <i
              class="codicon codicon-error"
              style="color: var(--error-color);"
            ></i>
          </div>
          <h2 class="creating-fix-title">Fix Creation Failed</h2>
          <p class="creating-fix-description">
            Nx Cloud was unable to generate a fix for the error. You can try
            running the task again or investigate the issue manually on the Nx
            Cloud UI
          </p>
        </div>
      `;
    }

    // Fix exists, show verification status
    switch (verificationStatus) {
      case 'IN_PROGRESS':
        return html`
          <div class="creating-fix-section">
            <div class="creating-fix-icon">
              <i class="codicon codicon-loading codicon-modifier-spin"></i>
            </div>
            <h2 class="creating-fix-title">
              Verifying Fix<span class="loading-dots"></span>
            </h2>
            <p class="creating-fix-description">
              Nx Cloud is verifying the fix. You can wait for verification to
              complete or apply the fix now if you're confident it's correct.
            </p>
          </div>
        `;
      case 'COMPLETED':
        return html`
          <div class="creating-fix-section">
            <div class="creating-fix-icon">
              <i
                class="codicon codicon-pass"
                style="color: var(--success-color);"
              ></i>
            </div>
            <h2 class="creating-fix-title">Fix Verified on Nx Cloud</h2>
            <p class="creating-fix-description">
              <span class="task-id">${aiFix.taskIds[0]}</span> has been
              successfully re-run on Nx Cloud after applying the suggested
              changes. You can now commit the fix to your branch using the
              controls above.
            </p>
          </div>
        `;
      case 'FAILED':
        return html`
          <div class="creating-fix-section">
            <div class="creating-fix-icon">
              <i
                class="codicon codicon-error"
                style="color: var(--error-color);"
              ></i>
            </div>
            <h2 class="creating-fix-title">Fix Verification Failed</h2>
            <p class="creating-fix-description">
              The fix verification failed on Nx Cloud. You may still apply it if
              you believe it's correct/useful.
            </p>
          </div>
        `;
      default:
        // NOT_STARTED or other states
        return html``;
    }
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

      ::slotted(a) {
        color: inherit;
        text-decoration: none;
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
