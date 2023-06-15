import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Field } from './field-mixin';
import { spread } from '@open-wc/lit-helpers';

@customElement('array-field')
export class ArrayField extends Field(LitElement) {
  @state()
  private elements: string[] = [];

  // TODO: GENERALIZE ICON ELEMENT
  renderField() {
    return html`<div>
      <div class="flex flex-row gap-2">
        ${this.renderInputField()}
        <button-element
          text="Add"
          appearance="secondary"
          @click="${this.addValue}"
        ></button-element>
      </div>
      <div class="mt-2">
        <p>${this.elements.length} items</p>
        <div class="flex flex-row gap-4 mt-2">
          ${this.elements.map(
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
    </div>`;
  }

  private renderInputField() {
    if (this.editor === 'intellij') {
      return html` <input
        class="bg-fieldBackground border border-fieldBorder grow"
        type="text"
        @keydown="${this.handleEnterKeyAdd}"
        ${spread(this.ariaAttributes)}
      />`;
    } else {
      return html`<vscode-text-field
        type="text"
        class="grow"
        @keydown="${this.handleEnterKeyAdd}"
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

  private handleEnterKeyRemove(index: number, event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      this.removeValue(index);
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
