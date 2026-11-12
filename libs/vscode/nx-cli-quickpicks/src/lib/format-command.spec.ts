import { formatCommand } from './format-command';

describe('formatCommand', () => {
  it('does not append a space when no flags are set', () => {
    expect(formatCommand('run app:build', [])).toBe('nx run app:build');
  });

  it('preserves flags and positional arguments in order', () => {
    expect(
      formatCommand('run app:dump', [
        '--note=two words',
        '--flag',
        'positional',
      ]),
    ).toBe('nx run app:dump "--note=two words" --flag positional');
  });

  it('quotes empty arguments and shell metacharacters', () => {
    expect(
      formatCommand('generate demo:lib', [
        '',
        'a; b',
        '$HOME',
        '`date`',
        'a"b',
        'a\\b',
      ]),
    ).toBe(
      'nx generate demo:lib "" "a; b" "\\$HOME" "\\`date\\`" "a\\"b" "a\\\\b"',
    );
  });
});
