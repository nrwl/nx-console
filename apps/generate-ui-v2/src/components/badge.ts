import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';
import { when } from 'lit/directives/when.js';
import { t } from 'xstate';

@customElement('badge-element')
export class Banner extends EditorContext(LitElement) {
  @property()
  text: string;

  @property()
  fieldId: string;

  render() {
    return html`
      <div
        tabindex="0"
        class="p-2 pb-0 flex flex-row gap-1 bg-badgeBackground text-badgeForeground rounded focus:ring-focusBorder focus:outline-none ${this.editorSpecificStyles()}"
        @keydown="${this.handleEnterKeyRemove}"
        data-cy="${this.fieldId}-item"
      >
        <p class="leading-none">${this.text}</p>
        <icon-element
          @click="${this.handleClickRemove}"
          icon="close"
          data-cy="${this.fieldId}-remove-button"
        ></icon-element>
      </div>
    `;
  }

  private editorSpecificStyles(): string {
    if (this.editor === 'intellij') {
      return 'border border-fieldBorder focus:ring-2';
    } else {
      return 'focus:ring-1 focus:!ring-offset-1 focus:!ring-offset-background';
    }
  }

  private handleEnterKeyRemove(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      this.dispatchEvent(new CustomEvent('remove'));
    }
  }

  private handleClickRemove() {
    this.dispatchEvent(new CustomEvent('remove'));
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
