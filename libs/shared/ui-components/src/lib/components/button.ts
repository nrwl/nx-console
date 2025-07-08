import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';
import { intellijFocusRing } from '../utils/ui-utils';

@customElement('button-element')
export class Button extends EditorContext(LitElement) {
  @property()
  text: string;

  @property()
  appearance: 'primary' | 'secondary' | 'icon' = 'primary';

  // only relevant in 'icon' mode
  @property()
  color: string;
  @property({ type: Boolean })
  applyFillColor = false;

  @property({ type: Boolean })
  disabled = false;

  override render() {
    return this.editor === 'vscode'
      ? this.renderVSCode()
      : this.renderIntellij();
  }

  renderVSCode() {
    if (this.appearance === 'icon') {
      return html`
        <vscode-button
          icon="${this.text}"
          ?disabled="${this.disabled}"
          aria-disabled="${this.disabled}"
          style="
          --vscode-button-background: none;
          --vscode-button-foreground: ${this.color ??
          'var(--foreground-color)'};
          --vscode-button-hoverBackground: var(--field-nav-hover-color);"
          class="h-[1.25rem] w-[1.25rem]"
        >
        </vscode-button>
      `;
    }
    return html`<vscode-button
      ?secondary="${this.appearance === 'secondary'}"
      ?disabled="${this.disabled}"
      aria-disabled="${this.disabled}"
      >${this.text}</vscode-button
    >`;
  }

  renderIntellij() {
    if (this.appearance === 'icon') {
      return html`<div
        class="${this.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-fieldNavHoverBackground cursor-pointer'} rounded p-1"
      >
        <icon-element
          icon="${this.text}"
          color="${this.color}"
          ?applyFillColor="${this.applyFillColor}"
          ?disabled="${this.disabled}"
          aria-disabled="${this.disabled}"
        ></icon-element>
      </div>`;
    }
    
    const baseClasses = 'whitespace-nowrap rounded px-4 py-1 transition-colors';
    
    let buttonClasses = '';
    if (this.appearance === 'primary') {
      buttonClasses = this.disabled 
        ? 'bg-primary/60 text-white/60 cursor-not-allowed'
        : 'bg-primary text-white cursor-pointer hover:opacity-90 focus:!ring-offset-1 focus:!ring-offset-background';
    } else {
      buttonClasses = this.disabled
        ? 'border !border-fieldBorder text-foreground/40 cursor-not-allowed'
        : 'border !border-fieldBorder text-foreground cursor-pointer hover:opacity-90 focus:!border-focusBorder';
    }
    
    return html`<button
      class="${this.disabled ? '' : intellijFocusRing} ${baseClasses} ${buttonClasses}"
      ?disabled="${this.disabled}"
      aria-disabled="${this.disabled}"
    >
      ${this.text}
    </button>`;
  }

  protected override createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
