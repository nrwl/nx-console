import { css } from '@microsoft/fast-element';

import {
  disabledCursor,
  display,
  focusVisible,
} from '@microsoft/fast-foundation';

const inputHeight = '26';
const inputMinWidth = '100px';
const borderWidth = '1';
const cornerRadius = '0';
const designUnit = '4';

export const styles = () => css`
  ${display('inline-flex')} :host {
    background: var(--vscode-dropdown-background);
    box-sizing: border-box;
    color: var(--vscode-foreground);
    contain: contents;
    font-family: var(--vscode-font-family);
    height: calc(${inputHeight} * 1px);
    position: relative;
    user-select: none;
    min-width: ${inputMinWidth};
    outline: none;
    vertical-align: top;
  }
  .control {
    align-items: center;
    box-sizing: border-box;
    border: calc(${borderWidth} * 1px) solid var(--vscode-dropdown-border);
    border-radius: calc(${cornerRadius} * 1px);
    cursor: pointer;
    display: flex;
    font-family: inherit;
    font-size: var(--vscode-font-size);
    line-height: normal;
    min-height: 100%;
    padding: 2px 6px 2px 8px;
    width: 100%;
  }
  .listbox {
    background: var(--vscode-dropdown-background);
    border: calc(${borderWidth} * 1px) solid var(--vscode-focusBorder);
    border-radius: calc(${cornerRadius} * 1px);
    box-sizing: border-box;
    display: inline-flex;
    flex-direction: column;
    left: 0;
    max-height: 200px;
    padding: 0 0 calc(${designUnit} * 1px) 0;
    overflow-y: auto;
    position: absolute;
    width: 100%;
    z-index: 1;
  }
  .listbox[hidden] {
    display: none;
  }
  :host(:${focusVisible}) .control {
    border-color: var(--vscode-focusBorder);
  }
  :host(:not([disabled]):hover) {
    background: var(--vscode-dropdown-background);
    border-color: var(--vscode-dropdown-border);
  }
  :host(:${focusVisible}) ::slotted([aria-selected="true"][role="option"]:not([disabled])) {
    background: var(--vscode-list-activeSelectionBackground);
    border: calc(${borderWidth} * 1px) solid var(--vscode-focusBorder);
    color: var(--vscode-list-activeSelectionForeground);
  }
  :host([disabled]) {
    cursor: ${disabledCursor};
    opacity: 0.4;
  }
  :host([disabled]) .control {
    cursor: ${disabledCursor};
    user-select: none;
  }
  :host([disabled]:hover) {
    background: var(--vscode-dropdown-background);
    color: var(--vscode-foreground);
    fill: currentcolor;
  }
  :host(:not([disabled])) .control:active {
    border-color: var(--vscode-focusBorder);
  }
  :host(:empty) .listbox {
    display: none;
  }
  :host([open]) .control {
    border-color: var(--vscode-focusBorder);
  }
  :host([open][position='above']) .listbox,
  :host([open][position='below']) .control {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  :host([open][position='above']) .control,
  :host([open][position='below']) .listbox {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
  :host([open][position='above']) .listbox {
    bottom: calc(${inputHeight} * 1px);
  }
  :host([open][position='below']) .listbox {
    top: calc(${inputHeight} * 1px);
  }
  .selected-value {
    flex: 1 1 auto;
    font-family: inherit;
    overflow: hidden;
    text-align: start;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .indicator {
    flex: 0 0 auto;
    margin-inline-start: 1em;
  }
  slot[name='listbox'] {
    display: none;
    width: 100%;
  }
  :host([open]) slot[name='listbox'] {
    display: flex;
    position: absolute;
  }
  .end {
    margin-inline-start: auto;
  }
  .start,
  .end,
  .indicator,
  .select-indicator,
  ::slotted(svg),
  ::slotted(span) {
    fill: currentcolor;
    height: 1em;
    min-height: calc(${designUnit} * 4px);
    min-width: calc(${designUnit} * 4px);
    width: 1em;
  }
  ::slotted([role='option']),
  ::slotted(option) {
    flex: 0 0 auto;
  }
`;
