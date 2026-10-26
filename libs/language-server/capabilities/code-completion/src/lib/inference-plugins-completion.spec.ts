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

  function writeModule(dir: string, file: string, content: string) {
    mkdirSync(join(dir, file, '..'), { recursive: true });
    writeFileSync(join(dir, file), content);
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

  it('includes plugins whose root entry exports createNodes as the bare package name', async () => {
    const vitest = addPackage('@nx/vitest', {
      main: './dist/index.js',
      exports: {
        '.': { types: './dist/index.d.ts', default: './dist/index.js' },
        './generators': './dist/generators.js',
      },
    });
    writeModule(
      vitest,
      'dist/index.js',
      [
        'exports.createNodesV2 = exports.createNodes = void 0;',
        'var plugin_1 = require("./src/plugins/plugin");',
        'Object.defineProperty(exports, "createNodes", { enumerable: true, get: function () { return plugin_1.createNodes; } });',
        'Object.defineProperty(exports, "createNodesV2", { enumerable: true, get: function () { return plugin_1.createNodesV2; } });',
      ].join('\n'),
    );
    const legacyMain = addPackage('nx-legacy-plugin', { main: './main.js' });
    writeModule(legacyMain, 'main.js', 'exports.createNodesV2 = void 0;');
    jest.mocked(workspaceDependencies).mockResolvedValue([vitest, legacyMain]);

    const labels = (await inferencePluginsCompletion(workspace)).map(
      (item) => item.label,
    );

    expect(labels).toEqual(['@nx/vitest', 'nx-legacy-plugin']);
  });

  it('prefers the /plugin entry point when the root entry also exports createNodes', async () => {
    const vite = addPackage(
      '@nx/vite',
      {
        exports: { '.': './dist/index.js', './plugin': './dist/plugin.js' },
      },
      ['dist/plugin.js'],
    );
    writeModule(vite, 'dist/index.js', 'exports.createNodes = void 0;');
    jest.mocked(workspaceDependencies).mockResolvedValue([vite]);

    const labels = (await inferencePluginsCompletion(workspace)).map(
      (item) => item.label,
    );

    expect(labels).toEqual(['@nx/vite/plugin']);
  });

  it('skips packages without a plugin entry point', async () => {
    const devkit = addPackage('@nx/devkit', {
      exports: { '.': './dist/index.js' },
    });
    writeModule(
      devkit,
      'dist/index.js',
      'tslib_1.__exportStar(require("nx/src/devkit-exports"), exports);',
    );
    jest
      .mocked(workspaceDependencies)
      .mockResolvedValue([
        devkit,
        addPackage('@nx/workspace', { main: './index.js' }),
      ]);

    expect(await inferencePluginsCompletion(workspace)).toEqual([]);
  });
});
