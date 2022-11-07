import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { WebviewState } from '../../lib/nx-cloud-service/nx-cloud-service';

@customElement('steps-element')
export class Steps extends LitElement {
  static styles = css`
    run-list-element {
      height: 100%;
    }
    vscode-progress-ring {
      padding-top: 5rem;
      margin: auto;
    }
  `;
  @property()
  state: WebviewState | undefined = undefined;

  render() {
    if (this.state?.isUsingPrivateCloud) {
      return html`
        <callout-element
          icon="error"
          message="Nx Console does not currently integrate with private cloud deployments. Please use the webapp to view your runs."
          actionText="Open Web App"
          @actionclicked=${() =>
            this.dispatchEvent(
              new Event('open-webapp-event', { bubbles: true, composed: true })
            )}
        >
        </callout-element>
      `;
    }
    if (this.state?.serverError) {
      return html`
        <callout-element
          icon="error"
          message="We could not connect to Nx Cloud, please verify your internet connection and settings. Click on retry to try again."
          actionText="Retry"
          noActionIcon="true"
          @actionclicked=${() =>
            this.dispatchEvent(
              new Event('refresh-event', { bubbles: true, composed: true })
            )}
        >
        </callout-element>
      `;
    }
    if (this.state?.isUsingCloudRunner === undefined) {
      return html` <vscode-progress-ring></vscode-progress-ring> `;
    }
    if (!this.state?.isUsingCloudRunner) {
      return html` <no-cache-element></no-cache-element> `;
    }

    return html`<run-list-element
      ?hasLoaded=${this.state?.hasLoadedWorkspaceDetails}
      ?canAccess=${this.state?.canAccessCloudWorkspace}
      ?runsLoading=${this.state?.runDetailsLoading}
      .runs=${this.state?.runDetails}
      .firstCommands=${this.state?.runFirstCommandOptions}
    ></run-list-element>`;
  }
}
