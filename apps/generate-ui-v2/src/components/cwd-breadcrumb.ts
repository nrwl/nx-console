import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';
import { GeneratorContextContext } from '../contexts/generator-context-context';

@customElement('cwd-breadcrumb')
export class CwdBreadcrumb extends GeneratorContextContext(
  EditorContext(LitElement)
) {
  @state() _path: string = '';
  @state() isEditable = false;

  set path(value: string) {
    this._path = value.startsWith('/') ? value.substring(1) : value;
  }

  get path() {
    return this._path;
  }

  toggleEdit() {
    this.isEditable = !this.isEditable;
  }

  confirmEdit() {
    this.path = this.renderRoot.querySelector('vscode-text-field')?.value || '';
    this.isEditable = false;
    this.dispatchValue();
  }

  editToSegment(index: number) {
    const pathArray = this.path.split('/');
    this.path = pathArray.slice(0, index + 1).join('/');
    this.dispatchValue();
  }

  resetPath() {
    this.path = '';
    this.isEditable = false;
    this.dispatchValue();
  }

  render() {
    const pathArray = this.path.split('/');
    return html`
      <div
        class="text-mutedForeground flex items-center rounded py-2 text-sm leading-none"
      >
        <span class="pr-2"> Working Directory: </span>
        <span
          @click="${this.resetPath}"
          class="hover:text-primary cursor-pointer underline"
        >
          {workspaceRoot}
        </span>
        <span class="mx-2">/</span>
        ${this.isEditable
          ? html`
              <vscode-text-field type="text" .value="${this.path}">
              </vscode-text-field>
              <icon-element
                @click="${this.toggleEdit}"
                icon="close"
              ></icon-element>
              <icon-element
                @click="${this.confirmEdit}"
                icon="check"
              ></icon-element>
            `
          : html`
              ${pathArray.map(
                (part, index) => html`
                  <span
                    class="${index !== pathArray.length - 1
                      ? 'underline cursor-pointer hover:text-primary'
                      : ''}"
                    @click="${() => this.editToSegment(index)}"
                    >${part}</span
                  >
                  ${index < pathArray.length - 1
                    ? html`<span class="mx-2">/</span>`
                    : ''}
                `
              )}
              <button-element
                @click="${this.toggleEdit}"
                color="var(--muted-foreground-color)"
                appearance="icon"
                text="edit"
                class="self-center"
              ></button-element>
            `}
      </div>
    `;
  }

  protected updated(_changedProperties: Map<PropertyKey, unknown>): void {
    super.updated(_changedProperties);

    if (_changedProperties.has('generatorContext')) {
      const prefillValue = this.generatorContext?.prefillValues?.cwd;
      console.log('prefillValue', prefillValue);
      if (prefillValue) {
        this.path = prefillValue;
        this.dispatchValue();
      }
    }
  }

  private dispatchValue() {
    this.dispatchEvent(
      new CustomEvent<string>('cwd-changed', {
        bubbles: true,
        composed: true,
        detail: this.path,
      })
    );
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
