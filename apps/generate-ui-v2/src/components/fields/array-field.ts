import { Option } from '@nx-console/shared/schema';
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Field } from './field-mixin';

@customElement('array-field')
export class ArrayField extends Field(LitElement) {
  @state()
  private elements: string[] = [];

  renderField() {
    if (this.editor === 'intellij') {
      return html``;
    } else {
      return this.renderVSCode();
    }
  }

  private renderVSCode() {
    return html`<div>
      <div class="flex flex-row gap-2">
        <vscode-text-field
          type="text"
          class="grow"
          @keydown="${this.handleEnterKeyAdd}"
        ></vscode-text-field>
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
                style="background-color: var(--badge-background);"
                class="p-2 pb-0 flex flex-row gap-1 focus:ring-1 focus:ring-focusBorder focus:outline-none"
                @keydown="${(event: KeyboardEvent) =>
                  this.handleEnterKeyRemove(index, event)}"
              >
                <p class="leading-none">${element}</p>
                <codicon-element
                  @click="${() => this.removeValue(index)}"
                  icon="close"
                ></codicon-element>
              </div>`
          )}
        </div>
      </div>
    </div>`;
  }

  private handleEnterKeyAdd(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.addValue();
    }
  }

  private handleEnterKeyRemove(index: number, event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.removeValue(index);
    }
  }

  private addValue() {
    const textfield = this.querySelector('vscode-text-field');
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
  ) {}
}
