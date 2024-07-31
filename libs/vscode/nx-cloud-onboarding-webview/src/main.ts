// eslint-disable-next-line @nx/enforce-module-boundaries
import type { CloudOnboardingInfo } from '@nx-console/shared/types';
import {
  Checkbox,
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeLink,
  vsCodeTag,
} from '@vscode/webview-ui-toolkit';

import { html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { WebviewApi } from 'vscode-webview';

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeLink(), vsCodeTag());

@customElement('root-element')
export class Root extends LitElement {
  @property({ type: Object })
  protected cloudOnboardingInfo: CloudOnboardingInfo | undefined;

  private vscodeApi: WebviewApi<undefined> = acquireVsCodeApi();

  override render() {
    return html`
      <div style="font-size: var(--vscode-font-size)">
        <div
          style="display: flex; justify-content: space-between; padding-top: 0.5rem"
        >
          <span>Remote caching</span>
          <span style="text-align: end;"
            >${this.cloudOnboardingInfo?.isConnectedToCloud
              ? 'Ready'
              : 'Action Required'}</span
          >
        </div>
        <div
          style="display: flex; justify-content: space-between; padding-top: 0.5rem"
        >
          <span>Task distribution</span>
          <span style="text-align: end;"
            >${this.cloudOnboardingInfo?.isConnectedToCloud
              ? 'Ready'
              : 'Action Required'}</span
          >
        </div>
        <div
          style="display: flex; justify-content: space-between; padding-top: 0.5rem"
        >
          <span>Repository connected</span>
          <span style="text-align: end;"
            >${this.cloudOnboardingInfo?.isConnectedToCloud &&
            this.cloudOnboardingInfo?.isWorkspaceClaimed
              ? 'Done'
              : 'Action Required'}</span
          >
        </div>
        <div
          style="display: flex; justify-content: space-between; padding-top: 0.5rem"
        >
          <span>Nx is used in CI</span>
          <span style="text-align: end;"
            >${this.cloudOnboardingInfo?.hasNxInCI
              ? 'Done'
              : 'Action Required'}</span
          >
        </div>
        <div
          style="display: flex; justify-content: space-between; padding-top: 0.5rem"
        >
          <span>Affected commands are used</span>
          <span style="text-align: end;"
            >${this.cloudOnboardingInfo?.hasAffectedCommandsInCI
              ? 'Done'
              : 'Action Required'}</span
          >
        </div>
      </div>

      <div style="height: 16px"></div>

      <div
        style="display: flex; justify-content: center; flex-direction: column;"
      >
        <vscode-button
          style=" margin-left: calc(var(--design-unit) * 6px + 4px); margin-right: calc(var(--design-unit) * 6px + 4px)"
          @click="${this.handleButtonClick}"
        >
          ${this.getButtonText()}</vscode-button
        >
        <div style="height: 0.5rem"></div>
        ${this.getMoreInfoText()}
      </div>
    `;
  }

  private getButtonText(): string | undefined {
    if (!this.cloudOnboardingInfo?.isConnectedToCloud) {
      return 'Connect to Nx Cloud';
    } else if (!this.cloudOnboardingInfo.isWorkspaceClaimed) {
      return 'Finish Nx Cloud Setup';
    } else if (!this.cloudOnboardingInfo.hasNxInCI) {
      return 'Generate CI configuration';
    } else if (!this.cloudOnboardingInfo.hasAffectedCommandsInCI) {
      return 'Learn about affected commands';
    } else if (!this.cloudOnboardingInfo.personalAccessToken) {
      return 'Login to Nx Cloud';
    } else {
      return 'Open Nx Cloud App';
    }
  }

  private getMoreInfoText(): TemplateResult<1> | undefined {
    if (!this.cloudOnboardingInfo?.isConnectedToCloud) {
      return html`<p>
        Nx Cloud facilitates Remote Caching, Task Distribution and more.
        <vscode-link href="https://nx.dev/ci/intro/why-nx-cloud"
          >Learn more about Nx Cloud</vscode-link
        >
      </p>`;
    } else if (!this.cloudOnboardingInfo.isWorkspaceClaimed) {
      return html`<p>
        Finish connecting your repository to Nx Cloud in the web application,
        gain access to the PR integration and more.
        <vscode-link href="https://nx.dev/ci/intro/why-nx-cloud"
          >Learn more about Nx Cloud</vscode-link
        >
      </p>`;
    } else if (!this.cloudOnboardingInfo.hasNxInCI) {
      return html`<p>
        Use our generator to easily create a CI configuration for your CI
        provider of choice.
        <vscode-link href="https://nx.dev/ci/intro/why-nx-cloud"
          >Learn more about Nx Cloud</vscode-link
        >
      </p>`;
    } else if (!this.cloudOnboardingInfo.hasAffectedCommandsInCI) {
      return html`<p>
        Affected commands are a powerful feature of Nx and allow you to skip any
        unnecessary computation in your CI pipeline.
        <vscode-link href="https://nx.dev/ci/intro/why-nx-cloud"
          >Learn more about Nx Cloud</vscode-link
        >
      </p>`;
    } else {
      return html``;
    }
  }

  private handleButtonClick() {
    if (!this.cloudOnboardingInfo?.isConnectedToCloud) {
      this.vscodeApi.postMessage({ type: 'connect-to-cloud' });
    } else if (!this.cloudOnboardingInfo.isWorkspaceClaimed) {
      this.vscodeApi.postMessage({
        type: 'finish-cloud-setup',
      });
    } else if (!this.cloudOnboardingInfo.hasNxInCI) {
      this.vscodeApi.postMessage({ type: 'generate-ci' });
    } else if (!this.cloudOnboardingInfo.hasAffectedCommandsInCI) {
      this.vscodeApi.postMessage({ type: 'show-affected-docs' });
    } else if (!this.cloudOnboardingInfo.personalAccessToken) {
      this.vscodeApi.postMessage({ type: 'login' });
    } else {
      this.vscodeApi.postMessage({ type: 'open-cloud-app' });
    }
  }

  protected override createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
