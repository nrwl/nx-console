import { html, LitElement, PropertyValueMap } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Field } from './field-mixin';

@customElement('checkbox-field')
export class CheckboxField extends Field(LitElement) {
  render() {
    if (this.editor === 'intellij') {
      return html`<input
        type="checkbox"
        class="form-checkbox bg-fieldBackground border border-fieldBorder rounded checked:bg-primary checked:border-transparent"
        @input="${this.handleChange}"
      />`;
    } else {
      return html`<vscode-checkbox
        @change="${this.handleChange}"
      ></vscode-checkbox>`;
    }
  }

  protected setFieldValue(
    value: string | number | boolean | string[] | undefined
  ): void {
    const inputElement = this.renderRoot.querySelector(
      this.editor === 'intellij' ? 'input' : 'vscode-checkbox'
    );
    if (!inputElement) {
      return;
    }
    inputElement.checked = Boolean(value);
  }

  handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).checked;
    this.dispatchValue(value);
  }
}
`=`;
