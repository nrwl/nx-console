import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EditorContext } from '../editor-context';

@customElement('banner-element')
export class Banner extends EditorContext(LitElement) {
  @property() message = '';
  @property() type: 'warning' | 'error' = 'warning'; // default type

  @state()
  private dismissed = false;

  private dismiss() {
    this.dismissed = true;
  }

  render() {
    const bannerClass =
      this.type === 'error' ? 'bg-bannerError' : 'bg-bannerWarning';
    if (this.dismissed) {
      return html``;
    }
    return html`
      <div
        class="w-full p-2 mt-2 text-left opacity-80 flex flex-row rounded-md ${bannerClass}"
      >
        <p class="grow">${this.message}</p>
        <div @click="${this.dismiss}" class="px-2 py-1">
          ${this.editor === 'intellij'
            ? html`x`
            : html` <codicon-element icon="close"></codicon-element>`}
        </div>
      </div>
    `;
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
