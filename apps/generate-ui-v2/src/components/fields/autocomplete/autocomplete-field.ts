import { Combobox, ComboboxAutocomplete } from '@microsoft/fast-foundation';
import { spread } from '@open-wc/lit-helpers';
import { LitElement, TemplateResult, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { extractItemOptions } from '../../../utils/generator-schema-utils';
import { Field } from '../mixins/field-mixin';
import { FieldWrapper } from '../mixins/field-wrapper-mixin';

@customElement('autocomplete-field')
export class AutocompleteField extends FieldWrapper(Field(LitElement)) {
  renderField(): TemplateResult {
    if (this.editor === 'vscode') {
      return this.renderVSCode();
    } else {
      return this.renderIntellij();
    }
  }

  private renderVSCode() {
    return html`
      <vscode-single-select
        @change="${this.handleChange}"
        ${spread(this.ariaAttributes)}
        ?invalid=${this.shouldRenderError()}
        class="w-full"
        filter="fuzzy"
        combobox
      >
        ${map(
          extractItemOptions(this.option),
          (item) => html`<vscode-option value="${item}">${item}</vscode-option>`
        )}
      </vscode-single-select>
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

  private handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dispatchValue(value);
  }

  setFieldValue(value: string | boolean | number | string[] | undefined) {
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
