// eslint-disable-next-line @nx/enforce-module-boundaries

import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('list-entry')
export class ListEntry extends LitElement {
  @property()
  protected completed = false;

  @property()
  protected text: string | undefined;

  protected override render() {
    return html`
      <div
        style="display: flex; align-items: center; width: 100%; font-size: var(--vscode-font-size); margin: calc(var(--design-unit) * 1px) 0;"
      >
        <span
          class="codicon codicon-${this.completed ? 'check' : 'circle'}"
          style="text-align: center; font-size: 1.2rem; margin: 0 calc(var(--design-unit) * 1px);"
        ></span>
        <span
          style="${this.completed
            ? 'text-decoration: line-through; color: var(--vscode-disabledForeground);'
            : ''}; line-height: 1.2rem; display: inline-flex; align-items: center;"
        >
          ${this.text}
        </span>
      </div>
    `;
  }

  protected override createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
