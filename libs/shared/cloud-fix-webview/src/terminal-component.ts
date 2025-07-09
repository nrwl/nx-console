import { html, LitElement, TemplateResult, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

@customElement('terminal-component')
export class TerminalComponent extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 300px;
      background-color: var(--vscode-panel-background, #1e1e1e);
      color: var(--vscode-terminal-foreground, #cccccc);
      font-family: var(
        --vscode-editor-font-family,
        'Menlo',
        'Monaco',
        'Courier New',
        monospace
      ) !important;
      font-size: var(--vscode-editor-font-size) !important;
    }

    .xterm-rows {
      font-size: var(--vscode-editor-font-size) !important;
    }

    #terminal-container {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
      padding: 10px 20px;
    }

    .xterm {
      height: 100%;
      cursor: text;
      position: relative;
      user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
    }

    .xterm.focus,
    .xterm:focus {
      outline: none;
    }

    .xterm .xterm-helpers {
      position: absolute;
      top: 0;
      /**
     * The z-index of the helpers must be higher than the canvases in order for
     * IMEs to appear on top.
     */
      z-index: 5;
    }

    .xterm .xterm-helper-textarea {
      padding: 0;
      border: 0;
      margin: 0;
      /* Move textarea out of the screen to the far left, so that the cursor is not visible */
      position: absolute;
      opacity: 0;
      left: -9999em;
      top: 0;
      width: 0;
      height: 0;
      z-index: -5;
      /** Prevent wrapping so the IME appears against the textarea at the correct position */
      white-space: nowrap;
      overflow: hidden;
      resize: none;
    }

    .xterm .composition-view {
      /* TODO: Composition position got messed up somewhere */
      background: #000;
      color: #fff;
      display: none;
      position: absolute;
      white-space: nowrap;
      z-index: 1;
    }

    .xterm .composition-view.active {
      display: block;
    }

    .xterm .xterm-viewport {
      /* On OS X this is required in order for the scroll bar to appear fully opaque */
      background-color: #000;
      overflow-y: scroll;
      cursor: default;
      position: absolute;
      right: 0;
      left: 0;
      top: 0;
      bottom: 0;
      height: 100% !important;
    }

    .xterm .xterm-screen {
      position: relative;
      height: 100%;
    }

    .xterm .xterm-screen canvas {
      position: absolute;
      left: 0;
      top: 0;
    }

    .xterm-char-measure-element {
      display: inline-block;
      visibility: hidden;
      position: absolute;
      top: 0;
      left: -9999em;
      line-height: normal;
    }

    .xterm.enable-mouse-events {
      /* When mouse events are enabled (eg. tmux), revert to the standard pointer cursor */
      cursor: default;
    }

    .xterm.xterm-cursor-pointer,
    .xterm .xterm-cursor-pointer {
      cursor: pointer;
    }

    .xterm.column-select.focus {
      /* Column selection mode */
      cursor: crosshair;
    }

    .xterm .xterm-accessibility:not(.debug),
    .xterm .xterm-message {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
      z-index: 10;
      color: transparent;
      pointer-events: none;
    }

    .xterm .xterm-accessibility-tree:not(.debug) *::selection {
      color: transparent;
    }

    .xterm .xterm-accessibility-tree {
      font-family: monospace;
      user-select: text;
      white-space: pre;
    }

    .xterm .xterm-accessibility-tree > div {
      transform-origin: left;
      width: fit-content;
    }

    .xterm .live-region {
      position: absolute;
      left: -9999px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    }

    .xterm-dim {
      /* Dim should not apply to background, so the opacity of the foreground color is applied
     * explicitly in the generated class and reset to 1 here */
      opacity: 1 !important;
    }

    .xterm-underline-1 {
      text-decoration: underline;
    }
    .xterm-underline-2 {
      text-decoration: double underline;
    }
    .xterm-underline-3 {
      text-decoration: wavy underline;
    }
    .xterm-underline-4 {
      text-decoration: dotted underline;
    }
    .xterm-underline-5 {
      text-decoration: dashed underline;
    }

    .xterm-overline {
      text-decoration: overline;
    }

    .xterm-overline.xterm-underline-1 {
      text-decoration: overline underline;
    }
    .xterm-overline.xterm-underline-2 {
      text-decoration: overline double underline;
    }
    .xterm-overline.xterm-underline-3 {
      text-decoration: overline wavy underline;
    }
    .xterm-overline.xterm-underline-4 {
      text-decoration: overline dotted underline;
    }
    .xterm-overline.xterm-underline-5 {
      text-decoration: overline dashed underline;
    }

    .xterm-strikethrough {
      text-decoration: line-through;
    }

    .xterm-screen .xterm-decoration-container .xterm-decoration {
      z-index: 6;
      position: absolute;
    }

    .xterm-screen
      .xterm-decoration-container
      .xterm-decoration.xterm-decoration-top-layer {
      z-index: 7;
    }

    .xterm-decoration-overview-ruler {
      z-index: 8;
      position: absolute;
      top: 0;
      right: 0;
      pointer-events: none;
    }

    .xterm-decoration-top {
      z-index: 2;
      position: relative;
    }

    /* Derived from vs/base/browser/ui/scrollbar/media/scrollbar.css */

    /* xterm.js customization: Override xterm's cursor style */
    .xterm .xterm-scrollable-element > .scrollbar {
      cursor: default;
    }

    /* Arrows */
    .xterm .xterm-scrollable-element > .scrollbar > .scra {
      cursor: pointer;
      font-size: 11px !important;
    }

    .xterm .xterm-scrollable-element > .visible {
      opacity: 1;

      /* Background rule added for IE9 - to allow clicks on dom node */
      background: rgba(0, 0, 0, 0);

      transition: opacity 100ms linear;
      /* In front of peek view */
      z-index: 11;
    }
    .xterm .xterm-scrollable-element > .invisible {
      opacity: 0;
      pointer-events: none;
    }
    .xterm .xterm-scrollable-element > .invisible.fade {
      transition: opacity 800ms linear;
    }

    /* Scrollable Content Inset Shadow */
    .xterm .xterm-scrollable-element > .shadow {
      position: absolute;
      display: none;
    }
    .xterm .xterm-scrollable-element > .shadow.top {
      display: block;
      top: 0;
      left: 3px;
      height: 3px;
      width: 100%;
      box-shadow: var(--vscode-scrollbar-shadow, #000) 0 6px 6px -6px inset;
    }
    .xterm .xterm-scrollable-element > .shadow.left {
      display: block;
      top: 3px;
      left: 0;
      height: 100%;
      width: 3px;
      box-shadow: var(--vscode-scrollbar-shadow, #000) 6px 0 6px -6px inset;
    }
    .xterm .xterm-scrollable-element > .shadow.top-left-corner {
      display: block;
      top: 0;
      left: 0;
      height: 3px;
      width: 3px;
    }
    .xterm .xterm-scrollable-element > .shadow.top.left {
      box-shadow: var(--vscode-scrollbar-shadow, #000) 6px 0 6px -6px inset;
    }

    .xterm .xterm-viewport::-webkit-scrollbar-thumb:active {
      background-color: var(--vscode-scrollbarSlider-activeBackground, #5a5a5a);
    }

    /* Hide the cursor */
    .xterm .xterm-cursor,
    .xterm .xterm-cursor-outline,
    .xterm .xterm-cursor-block {
      display: none !important;
      visibility: hidden !important;
    }
  `;

  @property({ type: String })
  content = '';

  @property({ type: Number })
  rows = 20;

  @property({ type: Number })
  cols = 80;

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;

  override render(): TemplateResult {
    return html`<div id="terminal-container"></div>`;
  }

  override firstUpdated(): void {
    this.initializeTerminal();
  }

  override updated(changedProperties: Map<string, any>): void {
    if (changedProperties.has('content') && this.terminal) {
      this.updateContent();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.terminal) {
      this.terminal.dispose();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }

  private initializeTerminal(): void {
    const container = this.shadowRoot?.getElementById('terminal-container');
    if (!container) return;

    // Create terminal with theme
    this.createTerminalWithTheme();

    this.terminal!.open(container);
    this.setupResizeObserver();
    this.setupThemeObserver();

    // Initial fit to ensure proper sizing
    setTimeout(() => {
      this.fitTerminal();
      // Ensure content is written after terminal is fully initialized
      if (this.content) {
        this.updateContent();
      }
    }, 100);
  }

  private createTerminalWithTheme(): void {
    const isDarkTheme = this.isDarkTheme();
    const theme = isDarkTheme ? this.getDarkTheme() : this.getLightTheme();

    this.terminal = new Terminal({
      theme: theme,
      rows: this.rows,
      cols: this.cols,
      lineHeight: 1.5,
      scrollback: 5000,
      convertEol: true,
      cursorBlink: false,
      cursorStyle: 'block',
      cursorInactiveStyle: 'none',
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
  }

  private isDarkTheme(): boolean {
    // Check VS Code theme by looking at the background color
    const computedStyle = getComputedStyle(this);
    const bgColor =
      computedStyle.getPropertyValue('--vscode-editor-background') || '#1e1e1e';

    // Parse the color and check brightness
    const rgb = this.parseColor(bgColor);
    if (rgb) {
      // Calculate relative luminance
      const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      return luminance < 0.5;
    }

    // Default to dark theme
    return true;
  }

  private parseColor(
    color: string,
  ): { r: number; g: number; b: number } | null {
    // Handle hex colors
    const hexMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16),
      };
    }

    // Handle rgb colors
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
      };
    }

    return null;
  }

  private getDarkTheme() {
    const computedStyle = getComputedStyle(this);
    return {
      background:
        computedStyle.getPropertyValue('--vscode-panel-background') ||
        '#1e1e1e',
      foreground:
        computedStyle.getPropertyValue('--vscode-terminal-foreground') ||
        '#cccccc',
      cursor:
        computedStyle.getPropertyValue('--vscode-terminalCursor-foreground') ||
        '#cccccc',
      selectionBackground:
        computedStyle.getPropertyValue(
          '--vscode-terminal-selectionBackground',
        ) || '#264f78',
      black:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBlack') ||
        '#000000',
      red:
        computedStyle.getPropertyValue('--vscode-terminal-ansiRed') ||
        '#cd3131',
      green:
        computedStyle.getPropertyValue('--vscode-terminal-ansiGreen') ||
        '#0dbc79',
      yellow:
        computedStyle.getPropertyValue('--vscode-terminal-ansiYellow') ||
        '#e5e510',
      blue:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBlue') ||
        '#2472c8',
      magenta:
        computedStyle.getPropertyValue('--vscode-terminal-ansiMagenta') ||
        '#bc3fbc',
      cyan:
        computedStyle.getPropertyValue('--vscode-terminal-ansiCyan') ||
        '#11a8cd',
      white:
        computedStyle.getPropertyValue('--vscode-terminal-ansiWhite') ||
        '#e5e5e5',
      brightBlack:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightBlack') ||
        '#666666',
      brightRed:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightRed') ||
        '#f14c4c',
      brightGreen:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightGreen') ||
        '#23d18b',
      brightYellow:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightYellow') ||
        '#f5f543',
      brightBlue:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightBlue') ||
        '#3b8eea',
      brightMagenta:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightMagenta') ||
        '#d670d6',
      brightCyan:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightCyan') ||
        '#29b8db',
      brightWhite:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightWhite') ||
        '#e5e5e5',
    };
  }

  private getLightTheme() {
    const computedStyle = getComputedStyle(this);
    return {
      background:
        computedStyle.getPropertyValue('--vscode-panel-background') ||
        '#ffffff',
      foreground:
        computedStyle.getPropertyValue('--vscode-terminal-foreground') ||
        '#333333',
      cursor:
        computedStyle.getPropertyValue('--vscode-terminalCursor-foreground') ||
        '#333333',
      selectionBackground:
        computedStyle.getPropertyValue(
          '--vscode-terminal-selectionBackground',
        ) || '#add6ff',
      black:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBlack') ||
        '#000000',
      red:
        computedStyle.getPropertyValue('--vscode-terminal-ansiRed') ||
        '#cd3131',
      green:
        computedStyle.getPropertyValue('--vscode-terminal-ansiGreen') ||
        '#00bc00',
      yellow:
        computedStyle.getPropertyValue('--vscode-terminal-ansiYellow') ||
        '#949800',
      blue:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBlue') ||
        '#0451a5',
      magenta:
        computedStyle.getPropertyValue('--vscode-terminal-ansiMagenta') ||
        '#bc05bc',
      cyan:
        computedStyle.getPropertyValue('--vscode-terminal-ansiCyan') ||
        '#0598bc',
      white:
        computedStyle.getPropertyValue('--vscode-terminal-ansiWhite') ||
        '#555555',
      brightBlack:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightBlack') ||
        '#666666',
      brightRed:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightRed') ||
        '#cd3131',
      brightGreen:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightGreen') ||
        '#14ce14',
      brightYellow:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightYellow') ||
        '#b5ba00',
      brightBlue:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightBlue') ||
        '#0451a5',
      brightMagenta:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightMagenta') ||
        '#bc05bc',
      brightCyan:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightCyan') ||
        '#0598bc',
      brightWhite:
        computedStyle.getPropertyValue('--vscode-terminal-ansiBrightWhite') ||
        '#a5a5a5',
    };
  }

  private setupThemeObserver(): void {
    // Watch for changes to the body's class attribute (VS Code adds theme classes)
    this.themeObserver = new MutationObserver(() => {
      this.updateTerminalTheme();
    });

    // Observe document body for class changes
    if (document.body) {
      this.themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-vscode-theme-kind'],
      });
    }

    // Also listen for style changes on the host element
    const hostObserver = new MutationObserver(() => {
      this.updateTerminalTheme();
    });
    hostObserver.observe(this, {
      attributes: true,
      attributeFilter: ['style'],
    });
  }

  private updateTerminalTheme(): void {
    if (!this.terminal) return;

    const isDarkTheme = this.isDarkTheme();
    const theme = isDarkTheme ? this.getDarkTheme() : this.getLightTheme();

    // Update terminal theme
    this.terminal.options.theme = theme;

    // Force a refresh
    this.terminal.refresh(0, this.terminal.rows - 1);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.terminal) {
        this.fitTerminal();
      }
    });
    this.resizeObserver.observe(this);
  }

  private fitTerminal(): void {
    if (!this.fitAddon) return;

    this.fitAddon.fit();
  }

  private updateContent(): void {
    if (!this.terminal || !this.content) return;

    this.terminal.clear();
    this.terminal.write(this.content);
  }
}
