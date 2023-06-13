import { html, LitElement, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Field } from './field-mixin';

@customElement('input-field')
export class InputField extends Field(LitElement) {
  protected renderField(): TemplateResult {
    if (this.editor === 'intellij') {
      return html`
        <input
          id="${this.fieldId}"
          class="bg-fieldBackground border border-fieldBorder"
          type="text"
          @input="${this.handleChange}"
        />
      `;
    } else {
      return html`
        <vscode-text-field
          id="${this.fieldId}"
          type="text"
          @input="${this.handleChange}"
          style="${this.shouldRenderError()
            ? '--border-width: 1; --dropdown-border: var(--vscode-inputValidation-errorBorder); --focus-border: var(--vscode-inputValidation-errorBorder);'
            : ''}"
        >
        </vscode-text-field>
      `;
    }
  }

  handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dispatchValue(value);
  }

  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ) {
    const inputNode = this.renderRoot.querySelector(
      this.editor === 'intellij' ? 'input' : 'vscode-text-field'
    );
    if (!inputNode) {
      return;
    }
    inputNode.value = `${value}`;
  }
}
