import { html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorContext } from '@nx-console/shared-ui-components';

@customElement('form-group-element')
export class FormGroupElement extends EditorContext(LitElement) {
  @property({ type: String }) variant: 'vertical' | 'horizontal' = 'vertical';

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
      <vscode-form-group variant="${this.variant}">
        <slot></slot>
      </vscode-form-group>
    `;
  }

  private renderIntellij(): TemplateResult {
    const classes =
      this.variant === 'vertical'
        ? 'flex flex-col gap-2'
        : 'flex items-center gap-4';

    return html`
      <div class="${classes}">
        <slot></slot>
      </div>
    `;
  }
}
