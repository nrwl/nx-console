import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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

@customElement('array-field')
export class ArrayField extends FieldWrapper(Field(LitElement)) {
  @state()
  private elements: string[] = [];

  renderField() {
    return html`<div>
      <div class="flex flex-row gap-2">
        ${this.renderInputField()}
        <button-element
          text="Add"
          appearance="secondary"
          @click="${this.addValue}"
          data-cy="${this.fieldId}-add-button"
          class="self-center"
          style="${this.shouldRenderError()
            ? '--field-border-color: var(--error-color); --focus-border-color: var(--error-color);'
            : ''}"
        ></button-element>
      </div>
      <div class="mt-2">
        <p>${this.elements.length} items</p>
        <div class="mt-2 flex flex-row gap-4">
          ${this.elements.map(
            (element, index) =>
              html`<badge-element
                text="${element}"
                fieldId="${this.fieldId}"
                @remove="${() => this.removeValue(index)}"
              ></badge-element>`
          )}
        </div>
      </div>
    </div>`;
  }

  private renderInputField() {
    if (this.editor === 'intellij') {
      return html` <input
        class="${intellijFieldColors} ${intellijFocusRing} ${intellijFieldPadding} ${intellijErrorRingStyles(
          this.shouldRenderError()
        )})} grow rounded"
        type="text"
        @keydown="${this.handleEnterKeyAdd}"
        ${spread(this.ariaAttributes)}
      />`;
    } else {
      return html`<vscode-text-field
        type="text"
        class="grow"
        @keydown="${this.handleEnterKeyAdd}"
        style="${vscodeErrorStyleOverrides(this.shouldRenderError())}"
        ${spread(this.ariaAttributes)}
      ></vscode-text-field>`;
    }
  }

  private get inputFieldSelector() {
    return this.editor === 'intellij' ? 'input' : 'vscode-text-field';
  }

  private handleEnterKeyAdd(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.addValue();
    }
  }

  private addValue() {
    const textfield = this.querySelector(this.inputFieldSelector);
    const inputValue = textfield?.value;
    if (!inputValue) {
      return;
    }
    this.elements = [...this.elements, inputValue];
    textfield.value = '';

    this.dispatchValue(this.elements);
  }

  private removeValue(index: number) {
    const copy = [...this.elements];
    copy.splice(index, 1);
    this.elements = copy;

    this.dispatchValue(this.elements);
  }

  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ) {
    if (typeof value === 'string') {
      this.elements = value.split(',');
    } else if (Array.isArray(value)) {
      this.elements = value;
    }
  }
}
