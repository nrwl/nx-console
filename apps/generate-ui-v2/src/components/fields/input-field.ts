import { spread } from '@open-wc/lit-helpers';
import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import {
  intellijErrorRingStyles,
  intellijFieldColors,
  intellijFieldPadding,
  intellijFocusRing,
} from '@nx-console/shared-ui-components';
import { Field } from './mixins/field-mixin';
import { FieldWrapper } from './mixins/field-wrapper-mixin';

@customElement('input-field')
export class InputField extends FieldWrapper(Field(LitElement)) {
  renderField(): TemplateResult {
    const error = this.shouldRenderError();
    if (this.editor === 'intellij') {
      return html`
        <input
          class="${intellijFieldColors} ${intellijFocusRing} ${intellijFieldPadding} ${intellijErrorRingStyles(
            error,
          )} rounded"
          type="text"
          @input="${this.handleChange}"
          ${spread(this.ariaAttributes)}
        />
      `;
    } else {
      return html`
        <vscode-textfield
          type="text"
          @input="${this.handleChange}"
          style="border-width: calc(var(--border-width) * 1px);"
          class="focus:border-focusBorder w-full"
          ?invalid=${this.shouldRenderError()}
          ${spread(this.ariaAttributes)}
        >
        </vscode-textfield>
      `;
    }
  }

  handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dispatchValue(value);
  }

  setFieldValue(value: string | boolean | number | string[] | undefined) {
    const inputNode = this.renderRoot.querySelector(
      this.editor === 'intellij' ? 'input' : 'vscode-textfield',
    );
    if (!inputNode) {
      return;
    }
    inputNode.value = `${value}`;
  }
}
