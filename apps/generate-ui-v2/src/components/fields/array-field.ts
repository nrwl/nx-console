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
      <vscode-text-field type="text"></vscode-text-field>
      <button-element text="Add" appearance="secondary"></button-element>
      ${this.elements}
    </div>`;
  }

  private addValue() {
    const textfield = this.querySelector('vscode-text-field');
    const inputValue = textfield?.value;
    if (!inputValue) {
      return;
    }
    this.elements = [...this.elements, inputValue];
    textfield.value = '';
  }

  protected setFieldValue(
    value: string | boolean | number | string[] | undefined
  ) {}
}
