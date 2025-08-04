import { join } from 'path';
import { execSync } from 'node:child_process';
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
  NxGeneratorsRequest,
  NxGeneratorsRequestOptions,
} from '@nx-console/language-server-types';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');
const pluginName = uniq('local-plugin');

describe('generator local plugin', () => {
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

    const workspacePath = join(e2eCwd, workspaceName);

    // Install @nx/plugin and create a local plugin using nx generators
    execSync('npm install -D @nx/plugin --legacy-peer-deps', { 
      cwd: workspacePath, 
      stdio: 'pipe' 
    });

    // Create a local plugin using nx generator (it comes with a default generator)
    execSync(`npx nx g @nx/plugin:plugin ${pluginName} --no-interactive`, {
      cwd: workspacePath,
      stdio: 'pipe'
    });

    // Start the language server
    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(workspacePath);
  });

  describe('local plugin generator', () => {
    it('should discover local plugin generators in NxGeneratorsRequest', async () => {
      const generators = await nxlsWrapper.sendRequest({
        ...NxGeneratorsRequest,
        params: {
          options: {
            includeHidden: false,
            includeNgAdd: false,
          } satisfies NxGeneratorsRequestOptions,
        },
      });

      expect(generators.result).toBeDefined();
      expect(generators.error).toBeUndefined();
      const generatorList = generators.result as GeneratorCollectionInfo[];

      // Should find the local plugin generator (default generator that comes with the plugin)
      const localGenerator = generatorList.find(
        (g) => g.name === `${pluginName}:${pluginName}`,
      );
      expect(localGenerator).toBeDefined();
      expect(localGenerator?.type).toBe('generator');
    });

    it('should successfully resolve local plugin generator options', async () => {
      const generatorPath = join(
        e2eCwd,
        workspaceName,
        pluginName,
        'src',
        'generators',
        pluginName,
        'schema.json',
      );

      const generatorOptions = await nxlsWrapper.sendRequest({
        ...NxGeneratorOptionsRequest,
        params: {
          options: {
            collection: pluginName,
            name: pluginName,
            path: generatorPath,
          } satisfies NxGeneratorOptionsRequestOptions,
        },
      });

      expect(generatorOptions.result).toBeDefined();
      expect(generatorOptions.error).toBeUndefined();
      const options = generatorOptions.result as any[];
      expect(options.length).toBeGreaterThan(0);
      expect(options.find((o) => o.name === 'name')).toBeDefined();
    });
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});