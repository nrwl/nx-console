import { Option } from '@nx-console/shared/schema';
import { html, LitElement, PropertyValueMap } from 'lit';
import { customElement } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { Field } from './field-mixin';
import { extractDefaultValue } from '../../generator-schema-utils';

@customElement('multiselect-field')
export class MultiselectField extends Field(LitElement) {
  renderField() {
    return html`
      <select @change="${this.handleChange}" multiple>
        ${map(
          this.extractItemOptions(this.option),
          (item) => html`<option value="${item}">${item}</option>`
        )}
      </select>
    `;
  }

  protected setFieldValue(
    value: string | number | boolean | string[] | undefined
  ): void {
    const selectNode = this.renderRoot.querySelector('select');
    if (!selectNode) {
      return;
    }
    Array.from(selectNode.options).forEach((option) => {
      if (!Array.isArray(value)) {
        return;
      }
      if (value.includes(option.value)) {
        option.selected = true;
      }
    });
  }

  private extractItemOptions(option: Option): string[] {
    if (!option.items) {
      return [];
    }
    if (Array.isArray(option.items)) {
      return option.items;
    }
    return option.items.enum;
  }

  private handleChange(e: Event) {
    const options = (e.target as HTMLSelectElement).options;
    const value = Array.from(options)
      .filter((option) => option.selected)
      .map((option) => option.value);
    this.dispatchValue(value);
  }
}
