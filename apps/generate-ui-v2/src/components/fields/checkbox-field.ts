import { spread } from '@open-wc/lit-helpers';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import {
  intellijFieldColors,
  intellijFocusRing,
} from '@nx-console/shared-ui-components';
import { CheckboxWrapper } from './mixins/checkbox-wrapper-mixin';
import { Field } from './mixins/field-mixin';

@customElement('checkbox-field')
export class CheckboxField extends CheckboxWrapper(Field(LitElement)) {
  renderField() {
    if (this.editor === 'intellij') {
      return html`<input
        type="checkbox"
        class="form-checkbox ${intellijFieldColors} checked:bg-primary ${intellijFocusRing} h-5 w-5 rounded checked:border-transparent focus:ring-offset-0"
        @input="${this.handleChange}"
        ${spread(this.ariaAttributes)}
      />`;
    } else {
      return html`<vscode-checkbox
        @change="${this.handleChange}"
        style="${this.shouldRenderError()
          ? '--border-width: 1; --checkbox-border: var(--vscode-inputValidation-errorBorder); --focus-border: var(--vscode-inputValidation-errorBorder);'
          : ''}"
        ${spread(this.ariaAttributes)}
        ?invalid=${this.shouldRenderError()}
      ></vscode-checkbox>`;
    }
  }

  setFieldValue(value: string | number | boolean | string[] | undefined): void {
    const inputElement = this.renderRoot.querySelector(
      this.editor === 'intellij' ? 'input' : 'vscode-checkbox',
    );
    if (!inputElement) {
      return;
    }
    inputElement.checked = Boolean(value);
  }

  handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).checked;
    this.dispatchValue(value);
  }
}
`=`;
