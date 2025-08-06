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

    console.log('creating local plugin');

    // Install @nx/plugin and create a local plugin using nx generators
    console.log(
      `[${new Date().toISOString()}] Running: npm install -D @nx/plugin --force`,
    );
    try {
      const installOutput = execSync('npm install -D @nx/plugin --force', {
        cwd: workspacePath,
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: 120000, // 2 minute timeout
      });
      console.log(
        `[${new Date().toISOString()}] npm install completed, output length: ${installOutput?.length || 0}`,
      );
    } catch (e) {
      console.error(`[${new Date().toISOString()}] npm install failed:`, e);
      throw e;
    }

    // Create a local plugin using nx generator (it comes with a default generator)
    console.log(
      `[${new Date().toISOString()}] Running: npx nx g @nx/plugin:plugin ${pluginName} --no-interactive`,
    );
    try {
      const pluginOutput = execSync(
        `npx nx g @nx/plugin:plugin ${pluginName} --no-interactive`,
        {
          cwd: workspacePath,
          stdio: 'pipe',
          encoding: 'utf-8',
          timeout: 60000, // 1 minute timeout
        },
      );
      console.log(
        `[${new Date().toISOString()}] Plugin creation completed, output length: ${pluginOutput?.length || 0}`,
      );
    } catch (e) {
      console.error(`[${new Date().toISOString()}] Plugin creation failed:`, e);
      throw e;
    }

    // create a new generator
    // libs/nx-plugin/src/generator
    console.log(
      `[${new Date().toISOString()}] Running: npx nx g @nx/plugin:generator --path ${pluginName}/src/generator/generator.ts --no-interactive`,
    );
    try {
      const generatorOutput = execSync(
        `npx nx g @nx/plugin:generator --path ${pluginName}/src/generator/generator.ts --no-interactive`,
        {
          cwd: workspacePath,
          stdio: 'pipe',
          encoding: 'utf-8',
          timeout: 60000, // 1 minute timeout
        },
      );
      console.log(
        `[${new Date().toISOString()}] Generator creation completed, output length: ${generatorOutput?.length || 0}`,
      );
    } catch (e) {
      console.error(
        `[${new Date().toISOString()}] Generator creation failed:`,
        e,
      );
      throw e;
    }

    // Start the language server
    console.log(`[${new Date().toISOString()}] Creating NxlsWrapper instance`);
    nxlsWrapper = new NxlsWrapper();
    console.log(
      `[${new Date().toISOString()}] Starting NXLS with workspace: ${workspacePath}`,
    );
    await nxlsWrapper.startNxls(workspacePath);
    console.log(`[${new Date().toISOString()}] NXLS started successfully`);
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

      const localGenerator = generatorList.find(
        (g) => g.name === `@${workspaceName}/${pluginName}:generator`,
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
        'generator',
        'schema.json',
      );

      const generatorOptions = await nxlsWrapper.sendRequest({
        ...NxGeneratorOptionsRequest,
        params: {
          options: {
            collection: pluginName,
            name: 'generator',
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
