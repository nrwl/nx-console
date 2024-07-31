// eslint-disable-next-line @nx/enforce-module-boundaries
import type { CloudOnboardingInfo } from '@nx-console/shared/types';
import {
  Checkbox,
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeCheckbox,
  vsCodeLink,
} from '@vscode/webview-ui-toolkit';

import { html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { WebviewApi } from 'vscode-webview';

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeCheckbox(),
  vsCodeLink()
);

@customElement('root-element')
export class Root extends LitElement {
  @property({ type: Object })
  protected cloudOnboardingInfo: CloudOnboardingInfo | undefined;

  private vscodeApi: WebviewApi<undefined> = acquireVsCodeApi();

  override render() {
    return html`
      <vscode-checkbox
        readonly
        ?checked="${this.cloudOnboardingInfo?.hasNxInCI}"
        style="width: 100%"
        >Nx is used in your CI configuration
        <vscode-link href="https://nx.dev/ci/intro/ci-with-nx"
          >[?]</vscode-link
        ></vscode-checkbox
      >
      <vscode-checkbox
        readonly
        ?checked="${this.cloudOnboardingInfo?.hasAffectedCommandsInCI}"
        style="width: 100%"
        >Affected commands are used
        <vscode-link href="https://nx.dev/ci/features/affected"
          >[?]</vscode-link
        >
      </vscode-checkbox>

      <div style="height: 8px"></div>
      <vscode-checkbox
        id="checkbox-cache"
        readonly
        ?checked="${this.cloudOnboardingInfo?.isConnectedToCloud &&
        this.cloudOnboardingInfo?.isWorkspaceClaimed}"
        style="width: 100%"
        >Remote Cache is Enabled
        <vscode-link href="https://nx.dev/ci/features/remote-cache"
          >[?]</vscode-link
        ></vscode-checkbox
      >
      <vscode-checkbox
        id="checkbox-distribution"
        readonly
        ?checked="${this.cloudOnboardingInfo?.isConnectedToCloud &&
        this.cloudOnboardingInfo?.isWorkspaceClaimed}"
        style="width: 100%"
        >Task Distribution is Enabled
        <vscode-link href="https://nx.dev/ci/features/distribute-task-execution"
          >[?]</vscode-link
        ></vscode-checkbox
      >

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

  override updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    if (
      this.cloudOnboardingInfo?.isConnectedToCloud &&
      !this.cloudOnboardingInfo?.isWorkspaceClaimed
    ) {
      const cacheCheckbox = this.shadowRoot?.getElementById(
        'checkbox-cache'
      ) as Checkbox;
      const distributionCheckbox = this.shadowRoot?.getElementById(
        'checkbox-distribution'
      ) as Checkbox;
      if (cacheCheckbox) {
        cacheCheckbox.indeterminate = true;
        cacheCheckbox.title =
          "Remote Cache is enabled but the workspace isn't claimed. Finish Nx Cloud Setup to claim it.";
      }
      if (distributionCheckbox) {
        distributionCheckbox.indeterminate = true;
        distributionCheckbox.title =
          "Remote Cache is enabled but the workspace isn't claimed. Finish Nx Cloud Setup to claim it.";
      }
    }
  }

  private getButtonText(): string | undefined {
    if (!this.cloudOnboardingInfo?.isConnectedToCloud) {
      return 'Connect to Nx Cloud';
    } else if (!this.cloudOnboardingInfo.personalAccessToken) {
      return 'Login to Nx Cloud';
    } else if (!this.cloudOnboardingInfo.isWorkspaceClaimed) {
      return 'Finish Nx Cloud Setup';
    } else if (!this.cloudOnboardingInfo.hasNxInCI) {
      return 'Generate CI configuration';
    } else if (!this.cloudOnboardingInfo.hasAffectedCommandsInCI) {
      return 'Learn about affected commands';
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
    } else if (!this.cloudOnboardingInfo.personalAccessToken) {
      return html`<p>
        Login to Nx Cloud to ensure your workspace is fully set up.
        <vscode-link href="https://nx.dev/ci/intro/why-nx-cloud"
          >Learn more about Nx Cloud</vscode-link
        >
      </p>`;
    } else if (!this.cloudOnboardingInfo.isWorkspaceClaimed) {
      return html`<p>
        Finish setting up your Nx Cloud workspace in the web application, gain
        access to the PR integration and more.
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
    } else if (!this.cloudOnboardingInfo.personalAccessToken) {
      this.vscodeApi.postMessage({ type: 'login' });
    } else if (!this.cloudOnboardingInfo.isWorkspaceClaimed) {
      this.vscodeApi.postMessage({
        type: 'finish-cloud-setup',
      });
    } else if (!this.cloudOnboardingInfo.hasNxInCI) {
      this.vscodeApi.postMessage({ type: 'generate-ci' });
    } else if (!this.cloudOnboardingInfo.hasAffectedCommandsInCI) {
      this.vscodeApi.postMessage({ type: 'show-affected-docs' });
    } else {
      this.vscodeApi.postMessage({ type: 'open-cloud-app' });
    }
  }
}
