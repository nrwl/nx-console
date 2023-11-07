import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  FormValuesService,
  formValuesServiceContext,
} from '../form-values.service';
import { consume } from '@lit/context';
import { when } from 'lit/directives/when.js';

@customElement('footer-element')
export class Footer extends LitElement {
  @consume({ context: formValuesServiceContext })
  public formValuesService: FormValuesService;

  @property()
  public dryRunOnChange: boolean;

  constructor() {
    super();
  }
  render() {
    return html`
      <div class="flex justify-end items-center pt-2 border-t-2 border-separator">
        <cwd-input-element></cwd-input-element>
        <div class="flex shrink-0">
          <button-element
            class="flex items-center py-2 pl-3 max-sm:hidden"
            appearance="icon"
            text="copy"
            title="Copy generate command to clipboard"
            @click="${() => this.formValuesService.copyCommandToClipboard()}"
            id="copy-button"
          >
          </button-element>
          ${when(
            !this.dryRunOnChange,
            () =>
              html`<button-element
                  class="py-2 pl-3 sm:hidden"
                  @click="${() => this.formValuesService.runGenerator(true)}"
                  text="debug"
                  appearance="icon"
                  title="Dry Run"
                >
                </button-element>
                <button-element
                  class="hidden py-2 pl-3 sm:block"
                  @click="${() => this.formValuesService.runGenerator(true)}"
                  text="Dry Run"
                  appearance="secondary"
                >
                </button-element> `
          )}

          <button-element
            class="py-2 pl-3"
            @click="${() => this.formValuesService.runGenerator()}"
            text="Generate"
            data-cy="generate-button"
          >
          </button-element>
        </div>
      </div>
          </div>
    `;
  }
  protected createRenderRoot() {
    return this;
  }
}
