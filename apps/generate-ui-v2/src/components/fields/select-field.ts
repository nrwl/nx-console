import { Option } from '@nx-console/shared/schema';
import { html, LitElement, PropertyValueMap } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { when } from 'lit/directives/when.js';
import { Field } from './field-mixin';
import { extractDefaultValue } from '../../utils/generator-schema-utils';
import { spread } from '@open-wc/lit-helpers';
import { intellijFocusRing } from '../../utils/ui-utils';

@customElement('select-field')
export class SelectField extends Field(LitElement) {
  renderField() {
    if (this.editor === 'intellij') {
      return this.renderIntellij();
    } else {
      return this.renderVscode();
    }
  }

  private renderIntellij() {
    return html`
      <select
        @change="${this.handleChange}"
        class="bg-selectFieldBackground border border-fieldBorder rounded ${intellijFocusRing}"
        ${spread(this.ariaAttributes)}
      >
        ${when(
          extractDefaultValue(this.option) === undefined,
          () => html`<option value="">--</option>`
        )}
        ${map(
          this.extractItemOptions(this.option),
          (item) => html`<option value="${item}">${item}</option>`
        )}
      </select>
    `;
  }

  private renderVscode() {
    return html`
      <vscode-dropdown
        @change="${this.handleChange}"
        style="${this.shouldRenderError()
          ? '--border-width: 1; --dropdown-border: var(--vscode-inputValidation-errorBorder); --focus-border: var(--vscode-inputValidation-errorBorder);'
          : ''}"
        ${spread(this.ariaAttributes)}
      >
        ${when(
          extractDefaultValue(this.option) === undefined,
          () => html`<vscode-option value="">--</vscode-option>`
        )}
        ${map(
          this.extractItemOptions(this.option),
          (item) => html`<vscode-option value="${item}">${item}</vscode-option>`
        )}
      </vscode-dropdown>
    `;
  }

  protected setFieldValue(
    value: string | number | boolean | string[] | undefined
  ): void {
    const selectNode = this.renderRoot.querySelector(
      this.editor === 'intellij' ? 'select' : 'vscode-dropdown'
    );
    if (!selectNode) {
      return;
    }
    selectNode.value = value ? `${value}` : '';
  }

  private extractItemOptions(option: Option): string[] {
    if (!option.items) {
      return [];
    }
    if (Array.isArray(option.items)) {
      return option.items;
    }
    return option.items.enum;
  }

  private handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.dispatchValue(value);
  }
}
