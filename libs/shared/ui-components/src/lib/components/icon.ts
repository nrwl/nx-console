import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';

@customElement('icon-element')
export class Icon extends EditorContext(LitElement) {
  @property()
  icon: string;

  @property()
  color = '';

  @property({ type: Boolean })
  applyFillColor = false;

  @property()
  size = '';

  override render() {
    if (this.editor === 'intellij') {
      return html`<img
        src="./icons/${this.icon}.svg"
        class="h-[${this.size ?? '1.25rem'}]"
        @load="${this.applyColorToSVG}"
      ></img>`;
    } else {
      let spanStyle = 'text-align: center;';

      // Use size prop if provided, otherwise default
      if (this.size) {
        spanStyle += ` font-size: ${this.size};`;
      } else {
        spanStyle += ' font-size: 0.9rem;';
      }

      spanStyle += ` color: ${this.color};`;

      return html`<span
        class="codicon codicon-${this.icon}"
        style="${spanStyle}"
      ></span>`;
    }
  }

  // we have to parse the svg file and forcefully update the color for intellij
  async applyColorToSVG() {
    if (!this.color) {
      return;
    }
    const svgResponse = await fetch(`./icons/${this.icon}.svg`);
    const svgData = await svgResponse.text();
    const parser = new DOMParser();
    const parsedSvg = parser.parseFromString(svgData, 'image/svg+xml');

    const allPaths = parsedSvg.querySelectorAll('path');
    allPaths.forEach((path) => {
      if (this.applyFillColor) {
        path.setAttribute('fill', this.color);
      }
      path.setAttribute('stroke', this.color);
    });

    const imgElement = this.querySelector('img');
    if (imgElement) {
      imgElement.remove();
    }

    parsedSvg.documentElement.classList.add('h-[1.25rem]');
    this.appendChild(parsedSvg.documentElement);
  }

  protected override createRenderRoot(): Element | ShadowRoot {
    return this;
  }
}
