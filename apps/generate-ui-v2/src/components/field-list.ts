import { LitElement, TemplateResult, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Option } from '@nx-console/shared/schema';
import { when } from 'lit/directives/when.js';

@customElement('field-list')
export class FieldList extends LitElement {
  @property()
  options: Option[];

  @property()
  searchValue: string | undefined;

  @state()
  private showMore = false;

  private toggleShowMore(e: CustomEvent) {
    this.showMore = !!e.detail;
  }

  protected render() {
    const hiddenOptionNames: Set<string> = getHiddenOptionNames(
      this.options,
      this.searchValue
    );
    const [importantOptions, otherOptions] = splitOptionsByPriority(
      this.options
    );
    const shouldShowMoreOptions =
      this.showMore || !!this.searchValue || importantOptions.length === 0;
    const shouldHideShowMoreButton =
      !!this.searchValue ||
      otherOptions.length === 0 ||
      importantOptions.length === 0;
    return html`
      <div class="flex h-full w-full">
        <div
          class="p-6 w-52 md:w-64 border-r-2 border-separator fixed h-full overflow-y-auto max-sm:hidden"
        >
          ${this.renderOptionNav(
            importantOptions,
            otherOptions,
            hiddenOptionNames,
            shouldShowMoreOptions
          )}
        </div>
        <div class="p-6 sm:ml-52 md:ml-64 w-full">
          ${renderOptions(importantOptions, hiddenOptionNames)}
          <show-more-divider
            @show-more=${this.toggleShowMore}
            class="${shouldHideShowMoreButton ? 'hidden' : ''}"
          ></show-more-divider>
          ${renderOptions(
            otherOptions,
            hiddenOptionNames,
            shouldShowMoreOptions
          )}
        </div>
      </div>
    `;
  }

  private renderOptionNav(
    importantOptions: Option[],
    otherOptions: Option[],
    hiddenOptionNames: Set<string>,
    showMore: boolean
  ): TemplateResult {
    const renderListItems = (options: Option[]): TemplateResult[] =>
      options.map(
        (option) =>
          html`<field-nav-item
            class="${hiddenOptionNames.has(option.name) ? 'hidden' : ''}"
            .option="${option}"
            @click=${this.handleTreeClickEvent}
          ></field-nav-item>`
      );
    return html`
      <ul>
        ${renderListItems(importantOptions)}
        ${when(showMore, () => renderListItems(otherOptions))}
      </ul>
    `;
  }

  protected firstUpdated(): void {
    this.updateComplete.then(() => {
      const field = Array.from(this.renderRoot.querySelectorAll('*')).find(
        (el) =>
          el.id.toLowerCase().endsWith('-field') && el instanceof HTMLElement
      );
      if (field) {
        (field as HTMLElement).focus();
      }
    });
  }

  private handleTreeClickEvent(event: Event) {
    const element = this.querySelector(
      `#option-${(event.target as HTMLElement).innerText}`
    );
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}

const renderOptions = (
  options: Option[],
  hiddenOptionNames: Set<string>,
  show = true
): TemplateResult => {
  return html`<div>
    ${options.map((option) => {
      const componentTag = getFieldComponent(option);
      const hidden = !show || hiddenOptionNames.has(option.name);

      return html` <div
        class="${hidden ? 'hidden' : ''}  mb-4"
        id="option-${option.name}"
      >
        ${componentTag}
      </div>`;
    })}
  </div>`;
};

const getFieldComponent = (option: Option) => {
  if (option.type === 'boolean') {
    return html` <checkbox-field .option=${option}></checkbox-field>`;
  }
  if (option.type === 'array') {
    if (option.items) {
      return html` <multiselect-field .option=${option}></multiselect-field> `;
    } else {
      return html` <array-field .option=${option}></array-field>`;
    }
  }
  if (option.items) {
    return html` <select-field .option=${option}></select-field>`;
  }
  return html` <input-field .option=${option}></input-field>`;
};

const getHiddenOptionNames = (
  options: Option[],
  searchValue: string | undefined
) => {
  const hiddenOptions = new Set<string>();
  if (!searchValue) {
    return hiddenOptions;
  }
  options?.forEach((option) => {
    if (!option.name.includes(searchValue)) {
      hiddenOptions.add(option.name);
    }
  });
  return hiddenOptions;
};

const splitOptionsByPriority = (options: Option[]): [Option[], Option[]] => {
  const importantOptions: Option[] = [];
  const otherOptions: Option[] = [];
  options?.forEach((option) => {
    if (option.isRequired || option['x-priority'] === 'important') {
      importantOptions.push(option);
    } else {
      otherOptions.push(option);
    }
  });
  return [importantOptions, otherOptions];
};
