import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { EditorContext } from '../contexts/editor-context';

@customElement('icon-element')
export class Icon extends EditorContext(LitElement) {
  @property()
  icon: string;

  @property()
  color = '';

  render() {
    if (this.editor === 'intellij') {
      return html`<img
        src="./icons/${this.icon}.svg"
        class="h-[1.25rem]"
        @load="${this.applyColorToSVG}"
      ></img>`;
    } else {
      return html`<span
        class="codicon codicon-${this.icon}"
        style="text-align: center; font-size: 0.9rem; color: ${this.color}"
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
      path.setAttribute('fill', this.color);
      path.setAttribute('stroke', this.color);
    });

    const imgElement = this.querySelector('img');
    if (imgElement) {
      imgElement.remove();
    }

    parsedSvg.documentElement.classList.add('h-[1.25rem]');
    this.appendChild(parsedSvg.documentElement);
  }

  protected createRenderRoot() {
    return this;
  }
}
