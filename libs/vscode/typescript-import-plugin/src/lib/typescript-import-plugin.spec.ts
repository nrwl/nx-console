import { isTestProject } from './typescript-import-plugin';

describe('isTestProject', () => {
  it.each([
    [['jest', 'node']],
    [['vitest/globals', 'vitest/importMeta', 'vite/client', 'node']],
    [['cypress', 'node']],
    [['mocha']],
    [['jasmine']],
  ])('treats a project with types %j as a test project', (types) => {
    expect(isTestProject('/repo/libs/a/tsconfig.json', types)).toBe(true);
  });

  it('does not treat a project with other types as a test project', () => {
    expect(isTestProject('/repo/libs/a/tsconfig.spec.json', ['node'])).toBe(
      false,
    );
    expect(isTestProject('/repo/libs/a/tsconfig.lib.json', [])).toBe(false);
  });

  it('falls back to the config file name when types are not set', () => {
    expect(isTestProject('/repo/libs/a/tsconfig.spec.json', undefined)).toBe(
      true,
    );
    expect(isTestProject('/repo/libs/a/tsconfig.lib.json', undefined)).toBe(
      false,
    );
    expect(isTestProject('/dev/null/inferredProject1*', undefined)).toBe(false);
  });
});
