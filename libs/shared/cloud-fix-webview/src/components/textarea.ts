import { html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorContext } from '@nx-console/shared-ui-components';

@customElement('textarea-element')
export class TextareaElement extends EditorContext(LitElement) {
  @property({ type: String }) value = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Number }) rows = 4;
  @property({ type: String }) placeholder = '';

  protected override createRenderRoot(): Element | ShadowRoot {
    return this;
  }

  override render(): TemplateResult {
    return this.editor === 'vscode'
      ? this.renderVSCode()
      : this.renderIntellij();
  }

  private renderVSCode(): TemplateResult {
    return html`
      <vscode-textarea
        value="${this.value}"
        ?disabled="${this.disabled}"
        rows="${this.rows}"
        placeholder="${this.placeholder}"
        @input="${this.handleInput}"
      ></vscode-textarea>
    `;
  }

  private renderIntellij(): TemplateResult {
    const disabledClasses = this.disabled 
      ? 'opacity-50 cursor-not-allowed' 
      : '';
    
    return html`
      <textarea
        .value="${this.value}"
        ?disabled="${this.disabled}"
        rows="${this.rows}"
        placeholder="${this.placeholder}"
        class="w-full px-3 py-2 text-foreground bg-fieldBackground border border-fieldBorder rounded focus:outline-none focus:ring-1 focus:ring-focusBorder resize-vertical font-mono text-sm ${disabledClasses}"
        @input="${this.handleInput}"
      ></textarea>
    `;
  }

  private handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.value = textarea.value;
    this.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }
}