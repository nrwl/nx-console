import { ContextProvider } from '@lit-labs/context';
import { html, LitElement, PropertyValueMap } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
import './components/fields/checkbox-field';
import './components/fields/array-field';
import './components/fields/input-field';
import './components/fields/multiselect-field';
import './components/fields/select-field';
import './components/button';
import './components/field-list';
import './components/search-bar';
import './components/banner';
import './components/icon';
import './components/field-nav-item';
import './components/show-more-divider';
import '@nx-console/shared/lit-utils';
import { editorContext } from './contexts/editor-context';
import {
  debounce,
  getGeneratorIdentifier,
} from './utils/generator-schema-utils';
import { IdeCommunicationController } from './ide-communication.controller';
import {
  formValuesServiceContext,
  FormValuesService,
} from './form-values.service';
import { submittedContext } from './contexts/submitted-context';

@customElement('root-element')
export class Root extends LitElement {
  private icc: IdeCommunicationController;

  private editorContextProvider = new ContextProvider(this, {
    context: editorContext,
  });

  private formValuesService: FormValuesService;
  private formValuesServiceContextProvider = new ContextProvider(this, {
    context: formValuesServiceContext,
  });

  private submittedContextProvider = new ContextProvider(this, {
    context: submittedContext,
    initialValue: false,
  });

  constructor() {
    super();
    this.icc = new IdeCommunicationController(this);

    this.editorContextProvider.setValue(this.icc.editor);

    this.formValuesService = new FormValuesService(this.icc, () =>
      this.handleValidFormChange()
    );
    this.formValuesServiceContextProvider.setValue(this.formValuesService);
  }

  @state()
  private searchValue = '';

  render() {
    const options = this.icc.generatorSchema?.options;
    return html` <div
      class="text-foreground h-screen flex flex-col"
      @keydown="${this.handleGlobalKeyboardShortcuts}"
    >
      <div
        class="sticky top-0 z-50 p-6 w-full bg-background border-b-2 border-separator"
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
      <div class="">
        <header class="flex justify-between items-center">
          <div class="flex flex-wrap gap-2 items-end">
            <h1 class="text-xl font-bold leading-none" data-cy="header-text">
              nx generate ${getGeneratorIdentifier(this.icc.generatorSchema)}
            </h1>
            ${when(
              isNxGenerator && this.icc.editor === 'vscode',
              () =>
                html`
                  <a
                    href="${nxDevLink}"
                    target="_blank"
                    class="text-sm underline leading-none pb-px focus:ring-1 focus:ring-focusBorder focus:outline-none"
                    >View full details
                  </a>
                `
            )}
          </div>

          <div class="flex space-x-2">
            ${when(
              !this.icc.configuration?.enableTaskExecutionDryRunOnChange,
              () =>
                html` <button-element
                  class="px-3 py-2"
                  @click="${() => this.runGenerator(true)}"
                  text="Dry Run"
                >
                </button-element>`
            )}

            <button-element
              class="px-3 py-2"
              @click="${() => this.runGenerator()}"
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
        </div>
      </div>
    `;
  }

  private handleSearchValueChange(e: CustomEvent) {
    this.searchValue = e.detail;
  }

  private handleValidFormChange() {
    if (this.icc.configuration?.enableTaskExecutionDryRunOnChange) {
      this.debouncedRunGenerator(true);
    }
  }

  private handleGlobalKeyboardShortcuts(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();

      if (e.shiftKey) {
        this.runGenerator(true);
      } else {
        this.runGenerator();
      }
    }
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const searchBar = this.renderRoot.querySelector('[id="search-bar"]');
      console.log(searchBar);
      if (searchBar) {
        (searchBar as HTMLElement).focus();
      }
    }
  }

  private runGenerator(dryRun = false) {
    const args = this.formValuesService.getSerializedFormValues();
    args.push('--no-interactive');
    if (dryRun) {
      args.push('--dry-run');
    }
    this.submittedContextProvider.setValue(true);
    this.icc.postMessageToIde({
      payloadType: 'run-generator',
      payload: {
        positional: getGeneratorIdentifier(this.icc.generatorSchema),
        flags: args,
      },
    });
  }

  private debouncedRunGenerator = debounce(
    (dryRun: boolean) => this.runGenerator(dryRun),
    500
  );

  protected createRenderRoot() {
    return this;
  }
}
