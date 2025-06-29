import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';

@customElement('badge-element')
export class Badge extends EditorContext(LitElement) {
  @property()
  text: string;

  @property()
  fieldId: string;

  override render() {
    return html`
      <div
        tabindex="0"
        class="bg-badgeBackground text-badgeForeground focus:ring-focusBorder ${this.editorSpecificStyles()} flex flex-row gap-1 rounded p-2 pb-0 focus:outline-none"
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

  protected override createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
