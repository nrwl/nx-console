import { LitElement, PropertyValueMap, TemplateResult, html } from 'lit';
import { Field } from '../mixins/field-mixin';
import { customElement } from 'lit/decorators.js';
import { FieldWrapper } from '../mixins/field-wrapper-mixin';
import { map } from 'lit/directives/map.js';
import { extractItemOptions } from '../../../utils/generator-schema-utils';
import { spread } from '@open-wc/lit-helpers';
import { Combobox, ComboboxAutocomplete } from '@microsoft/fast-foundation';

@customElement('autocomplete-field')
export class AutocompleteField extends FieldWrapper(Field(LitElement)) {
  protected renderField(): TemplateResult {
    if (this.editor === 'vscode') {
      return this.renderVSCode();
    } else {
      return this.renderIntellij();
    }
  }

  private renderVSCode() {
    return html`
      <vscode-combobox
        autocomplete="list"
        position="below"
        @change="${this.handleChange}"
        @input="${this.handleInput}"
        ${spread(this.ariaAttributes)}
      >
        ${map(
          extractItemOptions(this.option),
          (item) => html`<vscode-option value="${item}">${item}</vscode-option>`
        )}
      </vscode-combobox>
    `;
  }

  private renderIntellij() {
    return html`
      <intellij-combobox
        autocomplete="list"
        position="below"
        @change="${this.handleChange}"
        ${spread(this.ariaAttributes)}
      >
        ${map(
          extractItemOptions(this.option),
          (item) =>
            html`<intellij-option value="${item}">${item}</intellij-option>`
        )}
      </intellij-combobox>
    `;
  }

  protected updated(): void {
    const selector =
      this.editor === 'vscode' ? 'vscode-combobox' : 'intellij-combobox';
    const autocompleteNode = this.renderRoot.querySelector(selector);
    if (!autocompleteNode) {
      return;
    }
    // adapted from https://github.com/microsoft/fast/blob/master/packages/web-components/fast-foundation/src/combobox/combobox.ts
    autocompleteNode.filterOptions = function () {
      if (
        !this.autocomplete ||
        this.autocomplete === ComboboxAutocomplete.none
      ) {
        this.filter = '';
      }

      const filter = this.filter.toLowerCase();

      this.filteredOptions = this._options.filter((o: any) =>
        o.text.toLowerCase().includes(this.filter.toLowerCase())
      );

      if (this.isAutocompleteList) {
        if (!this.filteredOptions.length && !filter) {
          this.filteredOptions = this._options;
        }

        this._options.forEach((o: any) => {
          o.hidden = !this.filteredOptions.includes(o);
        });
      }
    };
  }

  private handleInput(e: Event) {
    const value = e.target as Combobox;
  }

  private handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dispatchValue(value);
  }

  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ) {
    const selector =
      this.editor === 'vscode' ? 'vscode-combobox' : 'intellij-combobox';
    const autocompleteNode = this.renderRoot.querySelector(selector);
    if (!autocompleteNode) {
      return;
    }
    // there is some internal setup that needs to happen before we can set the value
    customElements.whenDefined(selector).then(() => {
      autocompleteNode.value = value ? `${value}` : '';
    });
  }
}
