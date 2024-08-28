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
        style="display: flex; justify-content: space-between; padding-top: 0.5rem"
      >
        o
        <p style=${this.completed ? 'text-decoration: line-through;' : ''}>
          ${this.text}
        </p>
      </div>
    `;
  }
}
