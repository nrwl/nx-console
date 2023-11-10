import { Option } from '@nx-console/shared/schema';
import { html, LitElement, PropertyValueMap } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { Field } from './mixins/field-mixin';
import { extractDefaultValue } from '../../utils/generator-schema-utils';
import { when } from 'lit/directives/when.js';
import { spread } from '@open-wc/lit-helpers';
import {
  intellijErrorRingStyles,
  intellijFieldPadding,
  intellijFocusRing,
  vscodeErrorStyleOverrides,
} from '../../utils/ui-utils';
import { FieldWrapper } from './mixins/field-wrapper-mixin';

@customElement('multiselect-field')
export class MultiselectField extends FieldWrapper(Field(LitElement)) {
  @state()
  private selectedElements: string[] = [];

  renderField() {
    return html`
      <div class="flex flex-col">
        ${this.renderSelectField()}
        <div class="mt-2">
          ${when(
            this.selectedElements.length > 0,
            () => html`<p>Selected:</p>`
          )}
          <div class="mt-2 flex flex-row gap-4">
            ${this.selectedElements.map(
              (element, index) =>
                html`<badge-element
                  text="${element}"
                  fieldId="${this.fieldId}"
                  @remove="${() => this.removeValue(index)}"
                ></badge-element>`
            )}
          </div>
        </div>
      </div>
    `;
  }
  private renderSelectField() {
    if (this.editor === 'intellij') {
      return html`<select
        @change="${this.addValue}"
        class="bg-selectFieldBackground border-fieldBorder ${intellijFocusRing} ${intellijFieldPadding} ${intellijErrorRingStyles(
          this.shouldRenderError()
        )})} grow rounded border"
        ${spread(this.ariaAttributes)}
      >
        <option value="">
          ${this.selectedElements.length
            ? 'Add another value'
            : 'Select a value'}
        </option>
        ${map(
          this.extractItemOptions(this.option),
          (item) =>
            html`<option value="${item}" title="${item}">${item}</option>`
        )}
      </select>`;
    } else {
      return html` <vscode-dropdown
        @change="${this.addValue}"
        style="${vscodeErrorStyleOverrides(this.shouldRenderError())}"
        ${spread(this.ariaAttributes)}
      >
        <vscode-option value="">
          ${this.selectedElements.length
            ? 'Add another value'
            : 'Select a value'}
        </vscode-option>
        ${map(
          this.extractItemOptions(this.option),
          (item) =>
            html`<vscode-option value="${item}" title="${item}"
              >${item}</vscode-option
            >`
        )}
      </vscode-dropdown>`;
    }
  }

  private removeValue(index: number) {
    const copy = [...this.selectedElements];
    copy.splice(index, 1);
    this.selectedElements = copy;

    this.dispatchValue(this.selectedElements);
  }

  private addValue(e: Event) {
    const selectElement = e.target as HTMLSelectElement;
    const value = selectElement.value;
    if (!value) {
      return;
    }
    this.selectedElements = [...this.selectedElements, value];
    selectElement.value = '';
    this.dispatchValue(this.selectedElements);
  }

  protected setFieldValue(
    value: string | number | boolean | string[] | undefined
  ): void {
    let values: string[] = [];
    if (typeof value === 'string') {
      values = value.split(',');
    } else if (Array.isArray(value)) {
      values = value;
    }

    const possibleOptions = this.extractItemOptions(this.option);
    this.selectedElements = values.filter((value) =>
      possibleOptions.includes(value)
    );
    this.dispatchValue(this.selectedElements);
  }

  private extractItemOptions(option: Option): string[] {
    if (!option.items) {
      return [];
    }
    let options;

    if (Array.isArray(option.items)) {
      options = option.items;
    } else {
      options = option.items.enum;
    }

    return options.filter((item) => !this.selectedElements.includes(item));
  }
}
