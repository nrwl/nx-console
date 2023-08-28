import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';

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
        class="${bannerClass} text-bannerText mt-2 flex w-full flex-row rounded p-2 text-left opacity-80"
      >
        <p class="grow">${this.message}</p>
        <div @click="${this.dismiss}" class="px-2 py-1">
          ${this.editor === 'intellij'
            ? html`<icon-element
                icon="close"
                color="${getComputedStyle(this).getPropertyValue(
                  '--banner-text-color'
                )}"
              ></icon-element>`
            : html`<icon-element icon="close"></icon-element>`}
        </div>
      </div>
    `;
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
