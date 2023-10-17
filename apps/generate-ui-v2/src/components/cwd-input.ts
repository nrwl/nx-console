import { LitElement, PropertyValueMap, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { OptionChangedDetails } from './fields/mixins/field-mixin';
import { GeneratorContext } from '@nx-console/shared/generate-ui-types';
import { ContextConsumer } from '@lit-labs/context';
import { GeneratorContextContext } from '../contexts/generator-context-context';
import { EditorContext } from '../contexts/editor-context';
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
      <div class="border-separator mb-4 flex flex-col border-l-4 py-2 pl-3">
        <div>cwd</div>
        <p class="mb-2 text-gray-500">
          The directory the generator will be executed from. Relative to the
          workspace root.
        </p>
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

  protected firstUpdated(
    _changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>
  ): void {
    super.updated(_changedProperties);
    if (this.generatorContext) {
      const prefillValue = this.generatorContext.prefillValues?.cwd;
      if (prefillValue) {
        const inputNode = this.renderRoot.querySelector(
          this.editor === 'intellij' ? 'input' : 'vscode-text-field'
        );
        if (!inputNode) {
          return;
        }
        inputNode.value = prefillValue;
        this.dispatchValue(prefillValue);
      }
    }
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
