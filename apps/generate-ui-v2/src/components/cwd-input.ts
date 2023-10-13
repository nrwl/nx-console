import { LitElement, PropertyValueMap, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { OptionChangedDetails } from './fields/mixins/field-mixin';
import { GeneratorContext } from '@nx-console/shared/generate-ui-types';
import { ContextConsumer } from '@lit-labs/context';
import { generatorContextContext } from '../contexts/generator-context-context';
import { EditorContext } from '../contexts/editor-context';

@customElement('cwd-input-element')
export class CwdInput extends EditorContext(LitElement) {
  @state() generatorContext: GeneratorContext | undefined;

  constructor() {
    super();
    new ContextConsumer(this, {
      context: generatorContextContext,
      callback: (context) => (this.generatorContext = context),
      subscribe: false,
    });
  }

  render() {
    return html`
      <div class="border-separator flex flex-col border-l-4 py-2 pl-3">
        <div>cwd</div>
        <p class="mb-2 text-gray-500">
          The directory the generator will be executed from. Relative to the
          workspace root.
        </p>
        <vscode-text-field type="text" @input="${this.handleChange}">
        </vscode-text-field>
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
