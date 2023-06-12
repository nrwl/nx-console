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
    return html`
      <div class="flex h-full">
        <div
          class="p-6 w-52 border-r-2 border-fieldBorder fixed h-full overflow-y-auto max-sm:hidden"
        >
          ${this.renderOptionTree(
            importantOptions,
            otherOptions,
            hiddenOptionNames,
            this.showMore || !!this.searchValue
          )}
        </div>
        <div class="p-6 sm:ml-52 grow">
          ${renderOptions(importantOptions, hiddenOptionNames)}
          <show-more-divider
            @show-more=${this.toggleShowMore}
            class="${this.searchValue || otherOptions.length === 0
              ? 'hidden'
              : ''}"
          ></show-more-divider>
          ${renderOptions(
            otherOptions,
            hiddenOptionNames,
            this.showMore || !!this.searchValue
          )}
        </div>
      </div>
    `;
  }

  private renderOptionTree(
    importantOptions: Option[],
    otherOptions: Option[],
    hiddenOptionNames: Set<string>,
    showMore: boolean
  ): TemplateResult {
    const renderListItems = (options: Option[]): TemplateResult[] =>
      options.map(
        (option) =>
          html`<field-tree-item
            class="${hiddenOptionNames.has(option.name) ? 'hidden' : ''}"
            .option="${option}"
            @click=${this.handleTreeClickEvent}
          ></field-tree-item>`
      );
    return html`
      <ul>
        ${renderListItems(importantOptions)}
        ${when(showMore, () => renderListItems(otherOptions))}
      </ul>
    `;
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
        class="${hidden ? 'hidden' : ''}"
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
  options.forEach((option) => {
    if (!option.name.includes(searchValue)) {
      hiddenOptions.add(option.name);
    }
  });
  return hiddenOptions;
};

const splitOptionsByPriority = (options: Option[]): [Option[], Option[]] => {
  const importantOptions: Option[] = [];
  const otherOptions: Option[] = [];
  options.forEach((option) => {
    if (option.isRequired || option['x-priority'] === 'important') {
      importantOptions.push(option);
    } else {
      otherOptions.push(option);
    }
  });
  return [importantOptions, otherOptions];
};
