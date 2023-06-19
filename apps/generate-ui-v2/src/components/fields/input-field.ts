import { html, LitElement, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Field } from './mixins/field-mixin';
import { spread } from '@open-wc/lit-helpers';
import {
  intellijErrorRingStyles,
  intellijFieldColors,
  intellijFieldPadding,
  intellijFocusRing,
  vscodeErrorStyleOverrides,
} from '../../utils/ui-utils';
import { FieldWrapper } from './mixins/field-wrapper-mixin';

@customElement('input-field')
export class InputField extends FieldWrapper(Field(LitElement)) {
  protected renderField(): TemplateResult {
    const error = this.shouldRenderError();
    if (this.editor === 'intellij') {
      return html`
        <input
          class="${intellijFieldColors} ${intellijFocusRing} rounded ${intellijFieldPadding} ${intellijErrorRingStyles(
            error
          )}"
          type="text"
          @input="${this.handleChange}"
          ${spread(this.ariaAttributes)}
        />
      `;
    } else {
      return html`
        <vscode-text-field
          type="text"
          @input="${this.handleChange}"
          style="${vscodeErrorStyleOverrides(this.shouldRenderError())}"
          ${spread(this.ariaAttributes)}
        >
        </vscode-text-field>
      `;
    }
  }

  handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dispatchValue(value);
  }

  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ) {
    const inputNode = this.renderRoot.querySelector(
      this.editor === 'intellij' ? 'input' : 'vscode-text-field'
    );
    if (!inputNode) {
      return;
    }
    inputNode.value = `${value}`;
  }
}
