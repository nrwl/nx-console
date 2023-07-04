import { LitElement, TemplateResult, html } from 'lit';
import { Field } from './mixins/field-mixin';
import { customElement, state } from 'lit/decorators.js';
import { FieldWrapper } from './mixins/field-wrapper-mixin';
import { when } from 'lit/directives/when.js';
import { map } from 'lit/directives/map.js';
import { extractItemOptions } from '../../utils/generator-schema-utils';

@customElement('autocomplete-field')
export class AutocompleteField extends FieldWrapper(Field(LitElement)) {
  @state()
  private focused = false;

  @state()
  private value = '';

  protected renderField(): TemplateResult {
    return html`
      <fast-combobox autocomplete="both">
        ${map(
          extractItemOptions(this.option),
          (item) => html`<fast-option value="${item}">${item}</fast-option>`
        )}
      </fast-combobox>
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
