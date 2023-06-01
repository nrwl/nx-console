import { Option } from '@nx-console/shared/schema';
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('array-field')
export class ArrayField extends LitElement {
  @property()
  option: Option;

  render() {
    return html`<div>
      ARRAY FIELD
      <p>${JSON.stringify(this.option)}</p>
    </div>`;
  }
}
