import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  defaultVersion,
  e2eCwd,
  newWorkspace,
  uniq,
} from '@nx-console/shared-e2e-utils';
import {
  NxGeneratorOptionsRequest,
  NxGeneratorOptionsRequestOptions,
} from '@nx-console/language-server-types';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

describe('generator options', () => {
  beforeAll(async () => {
    // Create a new workspace with basic React setup
    newWorkspace({
      name: workspaceName,
      options: {
        preset: 'react-monorepo',
        bundler: 'vite',
        e2eTestRunner: 'cypress',
        style: 'css',
      },
      version: defaultVersion,
    });

    // Start the language server
    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
  });

  it('should return correct options for @nx/js:lib generator', async () => {
    const generatorOptions = await nxlsWrapper.sendRequest({
      ...NxGeneratorOptionsRequest,
      params: {
        options: {
          collection: '@nx/js',
          name: 'library',
          path: join(
            e2eCwd,
            workspaceName,
            'node_modules',
            '@nx/js/src/generators/library/schema.json',
          ),
        } satisfies NxGeneratorOptionsRequestOptions,
      },
    });

    // Verify the result contains expected options
    expect(generatorOptions.result).toBeDefined();
    const options = generatorOptions.result;

    // Check for required options
    expect((options as any[]).map((o) => o.name)).toEqual([
      'directory',
      'bundler',
      'importPath',
      'linter',
      'name',
      'publishable',
      'unitTestRunner',
      'includeBabelRc',
      'js',
      'minimal',
      'setParserOptionsProject',
      'skipTypeCheck',
      'strict',
      'tags',
      'testEnvironment',
      'useProjectJson',
      'config',
      'skipFormat',
      'skipPackageJson',
      'skipTsConfig',
      'buildable',
      'compiler',
      'simpleName',
    ]);
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
