export const intellijFocusRing =
  'focus:ring-2 focus:ring-focusBorder focus:outline-none';

export const intellijFieldColors =
  'bg-fieldBackground border border-fieldBorder';

export const intellijFieldPadding = 'px-2 py-1.5';

export const intellijErrorRingStyles = (error: boolean) =>
  error ? '!ring-2 !ring-error focus:!ring-error' : '';

export const vscodeErrorStyleOverrides = (error: boolean) =>
  error
    ? '--border-width: 1; --dropdown-border: var(--vscode-inputValidation-errorBorder); --focus-border: var(--vscode-inputValidation-errorBorder);'
    : '';
