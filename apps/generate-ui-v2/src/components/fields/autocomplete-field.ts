import { LitElement, TemplateResult, html } from 'lit';
import { Field } from './mixins/field-mixin';
import { customElement } from 'lit/decorators.js';
import { FieldWrapper } from './mixins/field-wrapper-mixin';
import { map } from 'lit/directives/map.js';
import { extractItemOptions } from '../../utils/generator-schema-utils';

@customElement('autocomplete-field')
export class AutocompleteField extends FieldWrapper(Field(LitElement)) {
  protected renderField(): TemplateResult {
    return html`
      <vscode-combobox autocomplete="both" @change="${this.handleChange}">
        ${map(
          extractItemOptions(this.option),
          (item) => html`<vscode-option value="${item}">${item}</vscode-option>`
        )}
      </vscode-combobox>
    `;
  }

  private handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dispatchValue(value);
  }

  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ) {
    const selectNode = this.renderRoot.querySelector('vscode-combobox');
    if (!selectNode) {
      return;
    }
    selectNode.value = value ? `${value}` : '';
  }
}
