import { LitElement, TemplateResult, html } from 'lit';
import { Field } from './mixins/field-mixin';
import { customElement } from 'lit/decorators.js';
import { FieldWrapper } from './mixins/field-wrapper-mixin';
import { map } from 'lit/directives/map.js';
import { extractItemOptions } from '../../utils/generator-schema-utils';

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
        autocomplete="both"
        position="below"
        @change="${this.handleChange}"
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
        autocomplete="both"
        position="below"
        @change="${this.handleChange}"
      >
        ${map(
          extractItemOptions(this.option),
          (item) =>
            html`<intellij-option value="${item}">${item}</intellij-option>`
        )}
      </intellij-combobox>
    `;
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
