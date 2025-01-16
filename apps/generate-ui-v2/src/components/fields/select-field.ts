import { spread } from '@open-wc/lit-helpers';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';
import {
  extractDefaultValue,
  extractItemOptions,
} from '../../utils/generator-schema-utils';
import {
  intellijErrorRingStyles,
  intellijFieldPadding,
  intellijFocusRing,
} from '../../utils/ui-utils';
import { Field } from './mixins/field-mixin';
import { FieldWrapper } from './mixins/field-wrapper-mixin';

@customElement('select-field')
export class SelectField extends FieldWrapper(Field(LitElement)) {
  renderField() {
    if (this.editor === 'intellij') {
      return this.renderIntellij();
    } else {
      return this.renderVscode();
    }
  }

  private renderIntellij() {
    return html`
      <select
        @change="${this.handleChange}"
        class="form-select bg-selectFieldBackground border-fieldBorder ${intellijFocusRing} ${intellijFieldPadding} ${intellijErrorRingStyles(
          this.shouldRenderError()
        )} rounded border"
        ${spread(this.ariaAttributes)}
      >
        ${when(
          extractDefaultValue(this.option) === undefined,
          () => html`<option value="">--</option>`
        )}
        ${map(
          extractItemOptions(this.option),
          (item) =>
            html`<option value="${item}" title="${item}">${item}</option>`
        )}
      </select>
    `;
  }

  private renderVscode() {
    const itemOptions = extractItemOptions(this.option);
    const defaultValue = extractDefaultValue(this.option);

    return html`
      <vscode-single-select
        @change="${this.handleChange}"
        class="w-full"
        ?invalid=${this.shouldRenderError()}
        ${spread(this.ariaAttributes)}
      >
        ${when(
          defaultValue === undefined,
          () => html`<vscode-option value="">--</vscode-option>`
        )}
        ${map(
          itemOptions,
          (item) =>
            html`<vscode-option value="${item}" title="${item}"
              >${item}</vscode-option
            >`
        )}
      </vscode-single-select>
    `;
  }

  setFieldValue(value: string | number | boolean | string[] | undefined): void {
    const selectNode = this.renderRoot.querySelector(
      this.editor === 'intellij' ? 'select' : 'vscode-single-select'
    );
    if (!selectNode) {
      return;
    }
    selectNode.value = value ? `${value}` : '';
  }

  handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dispatchValue(value);
  }
}
