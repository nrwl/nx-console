import { ContextProvider } from '@lit-labs/context';
import type { CIPEInfo, CIPERunGroup, NxAiFix } from '@nx-console/shared-types';
import {
  EditorContext,
  editorContext,
  getVscodeStyleMappings,
} from '@nx-console/shared-ui-components';
import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './terminal-component';
import './components';

export type NxCloudFixData = {
  cipe: CIPEInfo;
  runGroup: CIPERunGroup;
  terminalOutput?: string;
};

@customElement('nx-cloud-fix-component')
export class NxCloudFixComponent extends EditorContext(LitElement) {
  constructor() {
    super();

    if (this.editor === 'vscode') {
      // Add codicons CSS
      if (!document.querySelector('link[href*="codicon.css"]')) {
        const codiconsLink = document.createElement('link');
        codiconsLink.rel = 'stylesheet';
        codiconsLink.href =
          'https://unpkg.com/@vscode/codicons@0.0.36/dist/codicon.css';
        document.head.appendChild(codiconsLink);
      }
    }
  }

  protected override createRenderRoot(): Element | ShadowRoot {
    return this;
  }

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
      return html`<div
        class="text-foreground flex h-[200px] items-center justify-center text-xl"
      >
        Loading...
      </div>`;
    }

    const { cipe, runGroup, terminalOutput } = this.details;
    const aiFix = runGroup.aiFix;

    if (!aiFix) {
      return html`<div class="mx-auto flex w-full flex-col pb-6">
        No AI fix available
      </div>`;
    }

    return html`
      <div class="mx-auto flex w-full flex-col pb-6">
        ${this.renderHeader(cipe, runGroup)}

        <div class="flex flex-col px-3">
          <div class="px-3 py-2 pb-9">
            <p class="text-foreground m-0 leading-relaxed opacity-90">
              Nx Cloud AI analyzes your failing CI tasks and automatically
              generates fixes whenever possible. The AI examines the error
              output, identifies the root cause, and suggests minimal code
              changes to resolve the issue. Once generated, the fix is verified
              by running the same task on Nx Cloud to ensure it resolves the
              error.
            </p>
            <p class="text-foreground m-0 mt-2 leading-relaxed opacity-90">
              You can
              <span
                class="text-primary hover:text-primary cursor-pointer underline"
                @click="${() => this.handleShowDiff()}"
              >
                review the resulting git diff of the suggested changes</span
              >&nbsp;and choose to apply or reject them.
            </p>
          </div>
          ${aiFix.suggestedFix ? this.getFixSection(aiFix) : ''}
          ${aiFix.suggestedFix
            ? html`<div class="pointer-events-none relative m-0 h-9">
                <div
                  class="bg-border absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2"
                ></div>
                <div
                  class="border-b-border absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-b-[10px] border-l-[8px] border-r-[8px] border-l-transparent border-r-transparent"
                ></div>
              </div>`
            : ''}
          ${this.getStatusSection(aiFix)}
          <div class="pointer-events-none relative m-0 h-9">
            <div
              class="bg-border absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2"
            ></div>
            <div
              class="border-b-border absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-b-[10px] border-l-[8px] border-r-[8px] border-l-transparent border-r-transparent"
            ></div>
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
      <div class="bg-background mx-3 flex justify-between p-3">
        <div class="flex w-full flex-col">
          <div class="flex w-full items-center justify-between">
            <h1
              class="text-foreground m-0 flex items-center gap-2 text-2xl font-semibold"
            >
              <svg
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                fill="transparent"
                viewBox="0 0 24 24"
                id="nx-cloud-header-logo"
                class="stroke-foreground h-6 w-6 flex-shrink-0 fill-transparent"
              >
                <path
                  d="M22.167 7.167v-2.5a2.5 2.5 0 0 0-2.5-2.5h-15a2.5 2.5 0 0 0-2.5 2.5v15a2.5 2.5 0 0 0 2.5 2.5h2.5m15-15c-2.76 0-5 2.24-5 5s-2.24 5-5 5-5 2.24-5 5m15-15V19.59a2.577 2.577 0 0 1-2.576 2.576H7.167"
                  stroke-width="2"
                ></path>
              </svg>
              Nx Cloud AI Fix
              <a
                class="text-primary cursor-pointer"
                target="_blank"
                href="${cipe.cipeUrl}"
                title="View CI Pipeline Execution"
              >
                <icon-element icon="link-external"></icon-element>
              </a>
            </h1>
            <div
              class="bg-secondary text-secondaryForeground flex items-center gap-1.5 rounded-[18px] px-4 py-2 text-sm font-semibold"
            >
              <icon-element icon="git-branch"></icon-element>
              <a
                href="${cipe.commitUrl}"
                target="_blank"
                class="text-inherit no-underline hover:underline"
              >
                ${cipe.branch}
              </a>
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
        class="bg-background border-border ${this.isTerminalExpanded
          ? 'expanded'
          : ''} relative m-0 flex flex-col overflow-hidden rounded-none border"
      >
        <div
          class="${this.isTerminalExpanded
            ? 'border-b border-border'
            : 'border-b border-transparent transition-colors duration-200'} flex cursor-pointer select-none items-center gap-3 p-4 px-5"
          @click="${() => (this.isTerminalExpanded = !this.isTerminalExpanded)}"
        >
          <icon-element
            icon="${this.isTerminalExpanded ? 'chevron-down' : 'chevron-right'}"
            class="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center"
          ></icon-element>
          <h2 class="m-0 flex items-center gap-2 text-base font-semibold">
            Original failing task output:
            <span class="font-mono">nx run ${taskId}</span>
          </h2>
        </div>
        ${this.isTerminalExpanded
          ? html`
              <div
                class="flex h-[400px] min-h-[300px] flex-col overflow-hidden pb-5 pl-0 pr-5 pt-0"
              >
                <terminal-component
                  .content="${terminalOutput}"
                ></terminal-component>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private createCreatingFixSection(): TemplateResult {
    return html`
      <div
        class="border-border bg-background relative m-0 border p-6 text-center"
      >
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <icon-element
            icon="loading"
            class="animate-spin-slow leading-none"
          ></icon-element>
        </div>
        <h2 class="text-foreground m-0 mb-2 text-lg font-semibold">
          Creating Fix<span
            class="loading-dots inline-block w-6 text-left"
          ></span>
        </h2>
        <p class="text-foreground m-0 text-sm opacity-80">
          Nx Cloud AI is analyzing the error and generating a fix.
        </p>
      </div>
    `;
  }

  private getFixSection(aiFix: NxAiFix): TemplateResult {
    // If fix was rejected, show the rejected state
    if (aiFix.userAction === 'REJECTED') {
      return html`
        <div
          class="border-border bg-background relative m-0 border p-6 text-center"
        >
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <icon-element
              icon="circle-slash"
              class="text-foreground leading-none opacity-70"
            ></icon-element>
          </div>
          <h2 class="text-foreground m-0 mb-2 text-lg font-semibold">
            Fix Rejected
          </h2>
          <p class="text-foreground m-0 text-sm opacity-80">
            You chose not to apply the suggested fix.
          </p>
        </div>
      `;
    }

    // If fix was applied, show the applied state
    if (aiFix.userAction === 'APPLIED') {
      return html`
        <div
          class="border-border bg-background relative m-0 border p-6 text-center"
        >
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <icon-element
              icon="git-branch"
              class="text-success leading-none"
            ></icon-element>
          </div>
          <h2 class="text-foreground m-0 mb-2 text-lg font-semibold">
            Fix Applied
          </h2>
          <p class="text-foreground m-0 text-sm opacity-80">
            The suggested fix has been committed to your branch.
          </p>
        </div>
      `;
    }

    const showActions = true;

    return html`
      <div class="border-border bg-background relative m-0 border">
        <div
          class="border-border relative flex items-start justify-between border-b p-4 px-5"
        >
          <div class="flex-1">
            <h2 class="m-0 flex items-center gap-3 text-base font-semibold">
              <icon-element icon="sparkle"></icon-element>
              Apply Suggested Fix
            </h2>
          </div>
        </div>
        <div class="px-4 py-1 pb-4">
          <form-group-element variant="vertical">
            <label-element for="commit-message">Commit message</label-element>
            <textarea-element
              value="${aiFix.suggestedFixDescription ||
              'fix: nx cloud AI suggested fix'}"
              disabled
              rows="3"
            ></textarea-element>
          </form-group-element>
          ${showActions
            ? html`
                <div class="mt-4 flex justify-end gap-2">
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
    console.log('aiFix', aiFix);
    const hasAiFix = !!aiFix.suggestedFix;
    // TODO: Remove this once all environments have been migrated after deployment
    // Fall back to original validationStatus field for backwards compatibility
    const verificationStatus =
      aiFix.verificationStatus || (aiFix as any).validationStatus;

    const suggestedFixStatus = aiFix.suggestedFixStatus;

    if (suggestedFixStatus) {
      if (suggestedFixStatus === 'NOT_STARTED') {
        return this.createWaitingForFixSection();
      } else if (suggestedFixStatus === 'IN_PROGRESS') {
        return this.createCreatingFixSection();
      } else if (suggestedFixStatus === 'FAILED') {
        return this.createFixCreationFailedSection();
      } else if (suggestedFixStatus === 'NOT_EXECUTABLE') {
        return this.createCancelledFixSection();
      }
    } else {
      // todo: remove this once all environments have been updated
      if (!hasAiFix && verificationStatus === 'NOT_STARTED') {
        // Show creating fix state
        return this.createCreatingFixSection();
      }

      // if the fix creation failed, show the proper error state
      if (!hasAiFix && verificationStatus == 'FAILED') {
        return this.createFixCreationFailedSection();
      }
    }

    // Fix exists, show verification status
    switch (verificationStatus) {
      case 'IN_PROGRESS':
        return html`
          <div class="creating-fix-section">
            <div class="creating-fix-icon">
              <icon-element
                icon="loading"
                class="animate-spin-slow leading-none"
              ></icon-element>
            </div>
            <h2 class="creating-fix-title">
              Verifying Fix<span class="loading-dots"></span>
            </h2>
            <p class="text-foreground m-0 text-sm opacity-80">
              Nx Cloud is verifying the fix. You can wait for verification to
              complete or apply the fix now if you're confident it's correct.
            </p>
          </div>
        `;
      case 'COMPLETED':
        return html`
          <div
            class="border-border bg-background relative m-0 border p-6 text-center"
          >
            <div class="mb-2 flex items-center justify-center gap-3">
              <icon-element
                icon="verified"
                class="text-success leading-none"
              ></icon-element>
              <h2 class="text-foreground m-0 text-lg font-semibold">
                Fix Verified on Nx Cloud
              </h2>
            </div>
            <p class="text-foreground m-0 text-sm opacity-80">
              <span class="font-mono">${aiFix.taskIds[0]}</span> has been
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
              <icon-element
                icon="error"
                class="text-error leading-none"
              ></icon-element>
            </div>
            <h2 class="text-foreground m-0 mb-2 text-lg font-semibold">
              Fix Verification Failed
            </h2>
            <p class="text-foreground m-0 text-sm opacity-80">
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
  createCancelledFixSection(): TemplateResult {
    return html`
      <div class="creating-fix-section">
        <div class="creating-fix-icon">
          <i class="codicon codicon-circle-slash"></i>
        </div>
        <h2 class="creating-fix-title">Fix Creation Cancelled</h2>
        <p class="creating-fix-description">
          There were no fixes that were generated for this error.
        </p>
      </div>
    `;
  }

  createWaitingForFixSection(): TemplateResult {
    return html`
      <div class="creating-fix-section">
        <div class="creating-fix-icon">
          <i class="codicon codicon-info"></i>
        </div>
        <h2 class="creating-fix-title">
          Nx Cloud is preparing to generate a fix
        </h2>
        <p class="creating-fix-description">
          Nx Cloud is analyzing this run to see if a fix can be generated. This
          may take a moment. Please wait.
        </p>
      </div>
    `;
  }

  private createFixCreationFailedSection(): TemplateResult {
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
}

@customElement('pill-element')
class PillElement extends LitElement {
  protected override createRenderRoot(): Element | ShadowRoot {
    return this;
  }

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
    // Base classes for all pills
    const baseClasses =
      'bg-badgeBackground text-badgeForeground text-xs font-medium box-border rounded-[18px] px-3 py-1 mr-2.5 font-semibold flex';

    // Type-specific classes
    const typeClasses = {
      success: '!bg-success/10 !text-success',
      warning: '!bg-warning/10 !text-warning',
      error: '!bg-error/10 !text-error',
      info: '!bg-primary/10 !text-primary',
    };

    const classes = `${baseClasses} ${typeClasses[this.type] || ''}`;

    if (!this.text) {
      return html`<div class="${classes}">
        <div class="flex h-full items-center justify-center gap-1">
          <slot></slot>
        </div>
      </div>`;
    }
    return html`<div class="${classes}"><span>${this.text}</span></div>`;
  }
}
