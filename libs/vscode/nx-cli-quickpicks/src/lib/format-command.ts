export function formatCommand(command: string, flags: string[]): string {
  return ['nx', command, ...flags.map(quoteArgument)].join(' ');
}

function quoteArgument(value: string): string {
  if (value && /^[\w./:=,@%+-]+$/.test(value)) {
    return value;
  }
  return `"${value.replace(/[\\"$`]/g, '\\$&')}"`;
}
