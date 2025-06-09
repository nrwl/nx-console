import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { EditorContext, intellijFieldColors, intellijFieldPadding, intellijFocusRing } from '@nx-console/shared-ui-components';
import { GeneratorContextContext } from '../contexts/generator-context-context';
import { FormValueSubscriber } from './fields/mixins/form-value-subscriber-mixin';

const pathSeparator = window?.navigator?.userAgent?.includes('Win')
  ? '\\'
  : '/';

@customElement('cwd-breadcrumb')
export class CwdBreadcrumb extends FormValueSubscriber(
  GeneratorContextContext(EditorContext(LitElement)),
) {
  @state() _path = '';
  @state() isEditable = false;

  set path(value: string) {
    this._path = value.startsWith(pathSeparator) ? value.substring(1) : value;
  }

  get path() {
    return this._path;
  }

  getFieldNameForSubscription(): string | undefined {
    return 'cwd';
  }

  setFieldValue(value: any) {
    console.log('setting cwd value', value);
    this.path = value;
  }

  protected updated(changedProperties: Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);

    if (changedProperties.has('generatorContext')) {
      const prefillValue = this.generatorContext?.prefillValues?.cwd;
      if (prefillValue) {
        this.path = prefillValue;
        this.dispatchValue();
      }
    }
  }

  toggleEdit() {
    this.isEditable = !this.isEditable;
    if (this.isEditable) {
      setTimeout(() => {
        this.renderRoot
          .querySelector<HTMLInputElement>(
            this.editor === 'vscode' ? 'vscode-textfield' : 'input',
          )
          ?.focus();
      }, 0);
    }
  }

  confirmEdit() {
    this.path =
      this.renderRoot.querySelector(
        this.editor === 'vscode' ? 'vscode-textfield' : 'input',
      )?.value || '';
    this.isEditable = false;
    this.dispatchValue();
  }

  editToSegment(index: number) {
    const pathArray = this.path.split(pathSeparator);
    this.path = pathArray.slice(0, index + 1).join(pathSeparator);
    this.dispatchValue();
  }

  resetPath() {
    this.path = '';
    this.isEditable = false;
    this.dispatchValue();
  }

  render() {
    const pathArray = this.path.split(pathSeparator);
    const hasPathSegments = pathArray.filter((p) => !!p).length > 0;
    return html`
      <div
        data-cy="cwd-breadcrumb"
        class="text-mutedForeground flex flex-wrap items-center rounded py-2 text-sm leading-none"
      >
        <span class="pr-2"> Working Directory: </span>
        <span
          @click="${hasPathSegments
            ? this.resetPath
            : () => {
                return;
              }}"
          class="${hasPathSegments
            ? 'hover:text-primary cursor-pointer underline'
            : ''}"
        >
          {workspaceRoot}
        </span>
        <span class="mx-2">${pathSeparator}</span>
        ${this.isEditable
          ? html`
              ${this.renderInlineEdit()}
              <icon-element
                @click="${this.toggleEdit}"
                icon="close"
                data-cy="inline-edit-cancel"
              ></icon-element>
              <icon-element
                @click="${this.confirmEdit}"
                icon="check"
                data-cy="inline-edit-confirm"
              ></icon-element>
            `
          : html`
              ${pathArray.map(
                (part, index) => html`
                  <span
                    data-cy="cwd-breadcrumb-segment-${index}"
                    class="${index !== pathArray.length - 1
                      ? 'underline cursor-pointer hover:text-primary'
                      : ''}"
                    @click="${() => this.editToSegment(index)}"
                    >${part}</span
                  >
                  ${index < pathArray.length - 1
                    ? html`<span class="mx-2">${pathSeparator}</span>`
                    : ''}
                `,
              )}
              <button-element
                @click="${this.toggleEdit}"
                color="var(--muted-foreground-color)"
                .applyFillColor=${false}
                appearance="icon"
                text="edit"
                class="self-center"
                data-cy="inline-edit-button"
              ></button-element>
            `}
      </div>
    `;
  }

  renderInlineEdit() {
    if (this.editor === 'vscode') {
      return html` <vscode-textfield
        type="text"
        .value="${this.path}"
        @keydown="${this.handleInlineEditKeydown}"
        data-cy="inline-edit-field"
        style="border-width: calc(var(--border-width) * 1px);"
        class="focus:border-focusBorder"
      >
      </vscode-textfield>`;
    } else {
      return html`
        <input
          class="${intellijFieldColors} ${intellijFocusRing} ${intellijFieldPadding} cursor-pointer rounded"
          type="text"
          .value="${this.path}"
          @keydown="${this.handleInlineEditKeydown}"
          data-cy="inline-edit-field"
        />
      `;
    }
  }

  private handleInlineEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.confirmEdit();
    }
    if (event.key === 'Escape') {
      this.toggleEdit();
    }
  }

  private dispatchValue() {
    this.dispatchEvent(
      new CustomEvent<string>('cwd-changed', {
        bubbles: true,
        composed: true,
        detail: this.path,
      }),
    );
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
