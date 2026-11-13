import { stripAnsiFromError } from './strip-ansi-from-error';

describe('stripAnsiFromError', () => {
  it('removes terminal formatting while preserving code frames and error metadata', () => {
    const error = {
      name: 'AggregateCreateNodesError',
      message: '\u001b[31mValueExpected\u001b[39m',
      stack:
        'Error: \u001b[1mValueExpected\u001b[22m\n> 1 | { "broken": [ }\n    |              ^',
      file: 'apps/hello/project.json',
      pluginName: 'nx/core/project-json',
    };
    expect(stripAnsiFromError(error)).toEqual({
      ...error,
      message: 'ValueExpected',
      stack:
        'Error: ValueExpected\n> 1 | { "broken": [ }\n    |              ^',
    });
    expect(error.message).toContain('\u001b');
  });

  it('cleans nested causes and aggregate errors, including Error instances', () => {
    const cause = new Error('\u001b[31mparse failure\u001b[0m');
    cause.stack = 'Error: \u001b[31mparse failure\u001b[0m\n    at parseJson';
    const result = stripAnsiFromError({
      message: 'Project graph failed',
      cause: {
        errors: [{ error: cause, file: 'project.json', line: 1 }],
        cause: '\u001b[1mroot cause\u001b[0m',
      },
    });
    expect(result.cause.errors[0]).toEqual({
      error: {
        name: 'Error',
        message: 'parse failure',
        stack: 'Error: parse failure\n    at parseJson',
      },
      file: 'project.json',
      line: 1,
    });
    expect(result.cause.cause).toBe('root cause');
    expect(cause.message).toContain('\u001b');
  });

  it('preserves non-enumerable causes and errors on native errors', () => {
    const error = new AggregateError(
      [new Error('\u001b[31mparse failure\u001b[0m')],
      '\u001b[31mgraph failed\u001b[0m',
      { cause: new Error('\u001b[1mroot cause\u001b[0m') },
    );
    const result = stripAnsiFromError(error);
    expect(result.message).toBe('graph failed');
    expect(result.errors[0].message).toBe('parse failure');
    expect((result.cause as Error).message).toBe('root cause');
    expect(JSON.stringify(result)).not.toContain('\\u001b');
  });

  it('removes OSC hyperlinks as well as SGR colors', () => {
    expect(
      stripAnsiFromError({
        message: '\u001b]8;;https://nx.dev\u0007Nx docs\u001b]8;;\u0007',
      }),
    ).toEqual({ message: 'Nx docs' });
  });

  it('preserves absent errors, plain text, arrays, null and optional fields', () => {
    expect(stripAnsiFromError(undefined)).toBeUndefined();
    expect(
      stripAnsiFromError([
        { message: 'plain\ntext', stack: undefined, cause: null, code: 123 },
      ]),
    ).toEqual([
      { message: 'plain\ntext', stack: undefined, cause: null, code: 123 },
    ]);
  });
});
