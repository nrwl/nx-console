import { html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorContext } from '@nx-console/shared-ui-components';

@customElement('label-element')
export class LabelElement extends EditorContext(LitElement) {
  @property({ type: String }) for: string;

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
      <vscode-label for="${this.for}">
        <slot></slot>
      </vscode-label>
    `;
  }

  private renderIntellij(): TemplateResult {
    return html`
      <label 
        for="${this.for}" 
        class="text-foreground text-sm font-medium block"
      >
        <slot></slot>
      </label>
    `;
  }
}