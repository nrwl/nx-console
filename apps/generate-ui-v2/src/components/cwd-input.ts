import { LitElement, PropertyValueMap, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';
import { GeneratorContextContext } from '../contexts/generator-context-context';
import {
  intellijFieldColors,
  intellijFieldPadding,
  intellijFocusRing,
} from '../utils/ui-utils';

@customElement('cwd-input-element')
export class CwdInput extends GeneratorContextContext(
  EditorContext(LitElement)
) {
  render() {
    return html`
      <div class="flex items-center">
        <pre class="leading-[0]">
        cwd:
  </pre>
        ${this.editor === 'intellij'
          ? html`
              <input
                class="${intellijFieldColors} ${intellijFocusRing} ${intellijFieldPadding}  rounded"
                type="text"
                @input="${this.handleChange}"
              />
            `
          : html` <vscode-text-field type="text" @input="${this.handleChange}">
            </vscode-text-field>`}
      </div>
    `;
  }

  private handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;

    this.dispatchValue(value);
  }

  private dispatchValue(value: string) {
    this.dispatchEvent(
      new CustomEvent<string>('cwd-changed', {
        bubbles: true,
        composed: true,
        detail: value,
      })
    );
  }

  protected updated(
    _changedProperties: PropertyValueMap<this> | Map<PropertyKey, this>
  ): void {
    super.updated(_changedProperties);
    if (!_changedProperties.has('generatorContext') || !this.generatorContext) {
      return;
    }

    const prefillValue = this.generatorContext.prefillValues?.cwd;
    if (!prefillValue) {
      return;
    }

    const inputNode = this.renderRoot.querySelector(
      this.editor === 'intellij' ? 'input' : 'vscode-text-field'
    );
    if (!inputNode) {
      return;
    }

    inputNode.value = prefillValue;
    this.dispatchValue(prefillValue);
  }

  protected createRenderRoot() {
    return this;
  }
}
