/**
 * Splits free-form command text into arguments the way a POSIX shell would split words,
 * without performing any expansion: quotes group and are removed, `$`, backticks and `;` stay literal.
 * A backslash only escapes whitespace, quotes and another backslash, so Windows paths survive.
 */
export function splitCommandLine(text: string): string[] {
  const args: string[] = [];
  let current = '';
  let inWord = false;
  let quote: '"' | "'" | undefined;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else if (
        char === '\\' &&
        quote === '"' &&
        (text[i + 1] === '"' || text[i + 1] === '\\')
      ) {
        current += text[++i];
      } else {
        current += char;
      }
      continue;
    }
    if (/\s/.test(char)) {
      if (inWord) {
        args.push(current);
        current = '';
        inWord = false;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
      inWord = true;
    } else if (char === '\\' && /[\s"'\\]/.test(text[i + 1] ?? '')) {
      current += text[++i];
      inWord = true;
    } else {
      current += char;
      inWord = true;
    }
  }
  if (inWord) {
    args.push(current);
  }
  return args;
}
