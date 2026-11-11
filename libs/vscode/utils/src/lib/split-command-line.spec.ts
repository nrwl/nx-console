import { splitCommandLine } from './split-command-line';

describe('splitCommandLine', () => {
  it('splits ordinary flags on whitespace', () => {
    expect(
      splitCommandLine('--configuration=production --skip-nx-cache'),
    ).toEqual(['--configuration=production', '--skip-nx-cache']);
    expect(splitCommandLine('  --a   --b=1  ')).toEqual(['--a', '--b=1']);
    expect(splitCommandLine('')).toEqual([]);
  });

  it('groups quoted text and removes the quotes', () => {
    expect(splitCommandLine('--note="two words" --other=\'a b\'')).toEqual([
      '--note=two words',
      '--other=a b',
    ]);
    expect(splitCommandLine('"" a')).toEqual(['', 'a']);
    expect(splitCommandLine('--x="a \\"b\\" c"')).toEqual(['--x=a "b" c']);
  });

  it('keeps shell syntax literal', () => {
    expect(splitCommandLine('--a; touch x $(id) `id` | cat && true')).toEqual([
      '--a;',
      'touch',
      'x',
      '$(id)',
      '`id`',
      '|',
      'cat',
      '&&',
      'true',
    ]);
    expect(splitCommandLine('--x="$HOME `id`"')).toEqual(['--x=$HOME `id`']);
  });

  it('only treats a backslash as an escape before whitespace, quotes and backslashes', () => {
    expect(splitCommandLine('--path=C:\\repo\\dir a\\ b')).toEqual([
      '--path=C:\\repo\\dir',
      'a b',
    ]);
    expect(splitCommandLine('trailing\\')).toEqual(['trailing\\']);
  });
});
