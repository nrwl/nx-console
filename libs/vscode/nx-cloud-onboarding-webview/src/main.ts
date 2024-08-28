// eslint-disable-next-line @nx/enforce-module-boundaries
import type { CloudOnboardingInfo } from '@nx-console/shared/types';
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeLink,
  vsCodeTag,
} from '@vscode/webview-ui-toolkit';

import { html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { WebviewApi } from 'vscode-webview';

import './list-entry';

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeLink(), vsCodeTag());

@customElement('root-element')
export class Root extends LitElement {
  @property({ type: Object })
  protected cloudOnboardingInfo: CloudOnboardingInfo | undefined;

  private vscodeApi: WebviewApi<undefined> = acquireVsCodeApi();

  override render() {
    const { completed, notCompleted } = this.getElements();
    return html`
      <div style="font-size: var(--vscode-font-size)">
        ${completed.map(
          (text) =>
            html`<list-entry .text=${text} .completed=${true}></list-entry>`
        )}
        ${notCompleted.map(
          (text) =>
            html`<list-entry .text=${text} .completed=${false}></list-entry>`
        )}
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

  private getElements(): { completed: string[]; notCompleted: string[] } {
    const completed: string[] = [];
    const notCompleted: string[] = [];

    (this.cloudOnboardingInfo?.hasNxInCI ? completed : notCompleted).push(
      'Use Nx in your CI configuration'
    );

    (this.cloudOnboardingInfo?.hasAffectedCommandsInCI
      ? completed
      : notCompleted
    ).push('Use Nx affected commands in your CI configuration');

    (this.cloudOnboardingInfo?.isConnectedToCloud
      ? completed
      : notCompleted
    ).push('Enable remote caching with Nx Cloud');

    (this.cloudOnboardingInfo?.isConnectedToCloud
      ? completed
      : notCompleted
    ).push('Enable task distribution with Nx Cloud');

    (this.cloudOnboardingInfo?.isConnectedToCloud &&
    this.cloudOnboardingInfo?.isWorkspaceClaimed
      ? completed
      : notCompleted
    ).push('Finish connecting your repository to Nx Cloud');

    return {
      completed,
      notCompleted,
    };
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
