import { Option } from '@nx-console/shared/schema';
import { html, LitElement, PropertyValueMap } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { Field } from './field-mixin';
import { extractDefaultValue } from '../../generator-schema-utils';
import { when } from 'lit/directives/when.js';
import { spread } from '@open-wc/lit-helpers';

@customElement('multiselect-field')
export class MultiselectField extends Field(LitElement) {
  @state()
  private selectedElements: string[] = [];

  renderField() {
    return html`
      <div>
        ${this.renderSelectField()}
        <div class="mt-2">
          ${when(
            this.selectedElements.length > 0,
            () => html`<p>Selected:</p>`
          )}
          <div class="flex flex-row gap-4 mt-2">
            ${this.selectedElements.map(
              (element, index) =>
                html` <div
                  tabindex="0"
                  class="p-2 pb-0 flex flex-row gap-1 bg-badgeBackground focus:ring-1 focus:ring-focusBorder focus:outline-none"
                  @keydown="${(event: KeyboardEvent) =>
                    this.handleEnterKeyRemove(index, event)}"
                >
                  <p class="leading-none">${element}</p>
                  <icon-element
                    @click="${() => this.removeValue(index)}"
                    icon="close"
                  ></icon-element>
                </div>`
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
        class="bg-selectFieldBackground border border-fieldBorder"
        ${spread(this.ariaAttributes)}
      >
        <option value="">
          ${this.selectedElements.length
            ? 'Add another value'
            : 'Select a value'}
        </option>
        ${map(
          this.extractItemOptions(this.option),
          (item) => html`<option value="${item}">${item}</option>`
        )}
      </select>`;
    } else {
      return html` <vscode-dropdown
        @change="${this.addValue}"
        ${spread(this.ariaAttributes)}
      >
        <vscode-option value="">
          ${this.selectedElements.length
            ? 'Add another value'
            : 'Select a value'}
        </vscode-option>
        ${map(
          this.extractItemOptions(this.option),
          (item) => html`<vscode-option value="${item}">${item}</vscode-option>`
        )}
      </vscode-dropdown>`;
    }
  }

  private handleEnterKeyRemove(index: number, event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      this.removeValue(index);
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
