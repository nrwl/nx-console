import { LitElement, TemplateResult, html } from 'lit';
import { Field } from './mixins/field-mixin';
import { customElement, state } from 'lit/decorators.js';
import { FieldWrapper } from './mixins/field-wrapper-mixin';
import { when } from 'lit/directives/when.js';

@customElement('autocomplete-field')
export class AutocompleteField extends FieldWrapper(Field(LitElement)) {
  @state()
  private focused = false;

  @state()
  private value = '';

  protected renderField(): TemplateResult {
    return html`
      <vscode-text-field
        @focus="${() => (this.focused = true)}"
        @blur="${() => (this.focused = false)}"
        @input="${(e: Event) => this.handleInput(e)}"
      ></vscode-text-field>
      ${when(this.focused, () => {
        return html`<vscode-option value="123">test</vscode-option> `;
      })}
    `;
  }

  private handleInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.value = value;
  }

  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ) {
    // nooooooop
  }
}
