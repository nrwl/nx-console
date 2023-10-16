import { Option } from '@nx-console/shared/schema';
import { LitElement, TemplateResult, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { extractItemOptions } from '../utils/generator-schema-utils';
import { EditorContext } from '../contexts/editor-context';
import { GeneratorContextContext } from '../contexts/generator-context-context';

type OptionWithMetadata = {
  option: Option;
  isInSearchResults: boolean;
  isImportant: boolean;
};

@customElement('field-list')
export class FieldList extends GeneratorContextContext(
  EditorContext(LitElement)
) {
  @property()
  options: Option[];

  @property()
  searchValue: string | undefined;

  @state()
  private showMore = false;

  private toggleShowMore() {
    this.showMore = !this.showMore;
  }

  protected render() {
    const { optionsWithMetadata, numOfImportantOptions, numOfOtherOptions } =
      getOptionsWithMetadata(this.options, this.searchValue);

    const shouldShowMoreOptions =
      this.showMore || !!this.searchValue || numOfImportantOptions === 0;
    const shouldHideShowMoreButton =
      !!this.searchValue ||
      numOfOtherOptions === 0 ||
      numOfImportantOptions === 0;

    return html`
      <div class="flex h-full w-full">
        <div
          class="border-separator ${this.editor === 'intellij'
            ? 'hidden md:block'
            : 'max-sm:hidden md:w-64'} fixed h-full w-52 overflow-y-auto border-r-2  p-6"
        >
          ${this.renderOptionNav(optionsWithMetadata, shouldShowMoreOptions)}
        </div>
        <div
          class="${this.editor === 'intellij'
            ? 'md:ml-52 md:p-6'
            : 'sm:ml-52 sm:p-6 md:ml-64'} w-full pt-6"
        >
          ${this.renderOptionsWithDivider(
            optionsWithMetadata,
            shouldShowMoreOptions,
            shouldHideShowMoreButton
          )}
        </div>
      </div>
    `;
  }

  private renderOptionNav(
    optionsWithMetadata: OptionWithMetadata[],
    shouldShowMoreOptions: boolean
  ): TemplateResult {
    return html`
      <ul>
        ${optionsWithMetadata.map((optionWithMetadata) => {
          const hidden =
            this.searchValue && !optionWithMetadata.isInSearchResults;
          const greyedOut =
            !shouldShowMoreOptions && !optionWithMetadata.isImportant;

          return html`<field-nav-item
            class="${hidden ? 'hidden' : ''}"
            .option="${optionWithMetadata.option}"
            .greyedOut="${greyedOut}"
            @click=${(e: Event) => this.handleTreeClickEvent(e, greyedOut)}
          ></field-nav-item>`;
        })}
      </ul>
    `;
  }

  private renderOptionsWithDivider(
    optionsWithMetadata: OptionWithMetadata[],
    shouldShowMoreOptions: boolean,
    shouldHideShowMoreButton: boolean
  ): TemplateResult {
    // we need to render all options but hide some so the component instances are persisted
    const renderOption = (
      optionWithMetadata: OptionWithMetadata,
      hidden = false
    ) => {
      const componentTag = getFieldComponent(optionWithMetadata.option);
      return html` <div
        class="${hidden ? 'hidden' : ''} mb-4"
        id="option-${optionWithMetadata.option.name}"
      >
        ${componentTag}
      </div>`;
    };

    // if there is a search value, show all matching options regardless of importance
    if (this.searchValue) {
      return html`<div>
        ${optionsWithMetadata.map((opt) =>
          renderOption(opt, !opt.isInSearchResults)
        )}
      </div>`;
    }

    const importantOptions = optionsWithMetadata.filter(
      (opt) => opt.isImportant
    );

    const otherOptions = optionsWithMetadata.filter((opt) => !opt.isImportant);
    return html`
      ${importantOptions.map((opt) => renderOption(opt, false))}
      <show-more-divider
        .showMore=${this.showMore}
        @show-more=${this.toggleShowMore}
        class="${shouldHideShowMoreButton ? 'hidden' : ''}"
      ></show-more-divider>
      ${otherOptions.map((opt) => renderOption(opt, !shouldShowMoreOptions))}
      <cwd-input-element
        class="${(this.generatorContext?.nxVersion?.major ?? 0) >= 17 &&
        shouldShowMoreOptions
          ? ''
          : 'hidden'}"
      ></cwd-input-element>
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

  private handleTreeClickEvent(event: Event, wasGreyedOut: boolean) {
    const optionName = (event.target as HTMLElement).innerText;
    if (wasGreyedOut) {
      this.showMore = true;
    }
    setTimeout(() => {
      const element = this.querySelector(`#option-${optionName}`);
      if (!element) {
        return;
      }
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // focus field after scrolling to option
      const fieldElement = this.querySelector(`#${optionName}-field`);
      if (!fieldElement) {
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            (fieldElement as HTMLElement).focus();
            observer.disconnect();
          }
        },
        { rootMargin: '0px', threshold: 1.0 }
      );

      observer.observe(element);
    }, 100);
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}

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
    if (extractItemOptions(option).length > 10) {
      return html`<autocomplete-field .option=${option}></autocomplete-field>`;
    } else {
      return html` <select-field .option=${option}></select-field>`;
    }
  }
  return html` <input-field .option=${option}></input-field>`;
};

const getOptionsWithMetadata = (
  options: Option[],
  searchValue: string | undefined
): {
  optionsWithMetadata: OptionWithMetadata[];
  numOfImportantOptions: number;
  numOfOtherOptions: number;
} => {
  const optionsWithMetadata = options.map((option) => ({
    option,
    isInSearchResults: !searchValue || option.name.includes(searchValue),
    isImportant: option.isRequired || option['x-priority'] === 'important',
  }));
  return {
    optionsWithMetadata,
    numOfImportantOptions: optionsWithMetadata.filter(
      (option) => option.isImportant
    ).length,
    numOfOtherOptions: optionsWithMetadata.filter(
      (option) => !option.isImportant
    ).length,
  };
};
