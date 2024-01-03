import { html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import { FormValuesService } from './form-values.service';
import { IdeCommunicationController } from './ide-communication.controller';
import {
  getGeneratorIdentifier,
  getGeneratorNameTitleCase,
} from './utils/generator-schema-utils';

import './components/index';

@customElement('root-element')
export class Root extends LitElement {
  icc: IdeCommunicationController;

  private formValuesService: FormValuesService;

  constructor() {
    super();
    this.icc = new IdeCommunicationController(this);
    this.formValuesService = new FormValuesService(this);

    window.addEventListener('keydown', (e) =>
      this.handleGlobalKeyboardShortcuts(e)
    );
  }

  @state()
  private searchValue = '';

  render() {
    const options = this.icc.generatorSchema?.options;
    return html` <div
      class="text-foreground m-auto flex h-screen max-w-screen-xl flex-col p-6"
    >
      <div
        class="bg-background border-separator sticky top-0 z-50 w-full border-b-2 pb-3"
      >
        ${this.renderHeader()}
      </div>
      <div class="grow overflow-auto">
        ${!options || options.length === 0
          ? html`<p>No options</p>`
          : html` <field-list
              class="h-full"
              .options="${options}"
              .searchValue="${this.searchValue}"
            ></field-list>`}
      </div>
    </div>`;
  }

  private renderHeader() {
    const isNxGenerator =
      this.icc.generatorSchema?.collectionName?.includes('@nx') ||
      this.icc.generatorSchema?.collectionName?.includes('@nrwl');
    const nxDevLink = `https://nx.dev/packages/${this.icc.generatorSchema?.collectionName
      ?.replace('@nrwl/', '')
      ?.replace('@nx/', '')}/generators/${
      this.icc.generatorSchema?.generatorName
    }`;

    return html`
      <div>
        <header class="flex items-center justify-between">
          <div class="flex flex-col flex-wrap items-start gap-2">
            <h1 class="text-xl font-bold leading-none" data-cy="header-text">
              ${getGeneratorNameTitleCase(this.icc.generatorSchema)}
            </h1>
            <h2 class="inline-flex text-lg font-medium leading-none">
              ${this.icc.generatorSchema?.collectionName}
              <popover-element
                class="flex items-center pl-2 text-base"
                .content="${this.icc.generatorSchema?.description}"
              >
                <icon-element class="flex items-start" icon="info">
                </icon-element>
              </popover-element>
            </h2>
          </div>

          <div class="flex shrink-0">
            ${when(
              isNxGenerator && this.icc.editor === 'vscode',
              () =>
                html`
                  <button-element
                    @click="${() => this.openNxDev(nxDevLink)}"
                    title="Open generator documentation on nx.dev"
                    appearance="icon"
                    text="link-external"
                    class="focus:ring-focusBorder flex items-center py-2 pl-3 focus:outline-none focus:ring-1"
                  >
                  </button-element>
                `
            )}
            <button-element
              class="flex items-center py-2 pl-3"
              appearance="icon"
              text="copy"
              title="Copy generate command to clipboard"
              @click="${() => this.formValuesService.copyCommandToClipboard()}"
              id="copy-button"
            >
            </button-element>
            ${when(
              !this.icc.configuration?.enableTaskExecutionDryRunOnChange,
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
        </header>
        ${when(
          this.icc.banner,
          () =>
            html` <banner-element
              message="${this.icc.banner?.message}"
              type="${this.icc.banner?.type}"
            ></banner-element>`
        )}
        <div class="mt-5">
          <search-bar
            @search-input="${this.handleSearchValueChange}"
          ></search-bar>
          <cwd-breadcrumb></cwd-breadcrumb>
        </div>
      </div>
    `;
  }

  private handleSearchValueChange(e: CustomEvent) {
    this.searchValue = e.detail;
  }

  private handleGlobalKeyboardShortcuts(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();

      if (e.shiftKey) {
        this.formValuesService.runGenerator(true);
      } else {
        this.formValuesService.runGenerator();
      }
    }
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const searchBar = this.renderRoot.querySelector('[id="search-bar"]');
      if (searchBar) {
        (searchBar as HTMLElement).focus();
      }
    }
  }

  openNxDev(link: string) {
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank'; // Optional: Open in new tab
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  protected createRenderRoot() {
    return this;
  }
}
