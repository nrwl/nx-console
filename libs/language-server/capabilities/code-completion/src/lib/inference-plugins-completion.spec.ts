import { workspaceDependencies } from '@nx-console/shared-npm';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  inferencePluginsCompletion,
  resetInferencePluginsCompletionCache,
} from './inference-plugins-completion';

jest.mock('@nx-console/shared-nx-workspace-info', () => ({
  getNxVersion: jest.fn(() =>
    Promise.resolve({ major: 24, minor: 0, full: '24.0.0' }),
  ),
}));

jest.mock('@nx-console/shared-npm', () => ({
  workspaceDependencies: jest.fn(),
}));

describe('inferencePluginsCompletion', () => {
  let workspace: string;

  function addPackage(
    name: string,
    packageJson: Record<string, unknown>,
    files: string[] = [],
  ): string {
    const dir = join(workspace, 'node_modules', name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name, ...packageJson }),
    );
    for (const file of files) {
      mkdirSync(join(dir, file, '..'), { recursive: true });
      writeFileSync(join(dir, file), '');
    }
    return dir;
  }

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'inference-plugins-completion-'));
    resetInferencePluginsCompletionCache();
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('includes plugins that expose ./plugin through package.json exports', async () => {
    jest.mocked(workspaceDependencies).mockResolvedValue([
      addPackage(
        '@nx/vite',
        {
          exports: {
            '.': './dist/index.js',
            './plugin': {
              types: './dist/plugin.d.ts',
              default: './dist/plugin.js',
            },
          },
        },
        ['dist/plugin.js'],
      ),
      addPackage('@nx/eslint', { exports: { './plugin': './plugin.js' } }, [
        'plugin.js',
      ]),
    ]);

    const labels = (await inferencePluginsCompletion(workspace)).map(
      (item) => item.label,
    );

    expect(labels).toEqual(['@nx/vite/plugin', '@nx/eslint/plugin']);
  });

  it('includes plugins with a plugin.js at the package root', async () => {
    jest
      .mocked(workspaceDependencies)
      .mockResolvedValue([addPackage('@nx/jest', {}, ['plugin.js'])]);

    const labels = (await inferencePluginsCompletion(workspace)).map(
      (item) => item.label,
    );

    expect(labels).toEqual(['@nx/jest/plugin']);
  });

  it('skips packages without a plugin entry point', async () => {
    jest
      .mocked(workspaceDependencies)
      .mockResolvedValue([
        addPackage('@nx/devkit', { exports: { '.': './dist/index.js' } }),
        addPackage('@nx/workspace', { main: './index.js' }),
      ]);

    expect(await inferencePluginsCompletion(workspace)).toEqual([]);
  });
});
