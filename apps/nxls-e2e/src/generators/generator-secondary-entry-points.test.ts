import { join } from 'path';
import { execSync } from 'node:child_process';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  defaultVersion,
  e2eCwd,
  newWorkspace,
  uniq,
  modifyJsonFile,
} from '@nx-console/shared-e2e-utils';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  NxGeneratorOptionsRequest,
  NxGeneratorOptionsRequestOptions,
  NxGeneratorsRequest,
  NxGeneratorsRequestOptions,
} from '@nx-console/language-server-types';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');
const pluginName = uniq('test-plugin');

describe('generator secondary entry points', () => {
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

    // Install @nx/plugin and create a plugin with secondary entry points
    execSync('npm install -D @nx/plugin --legacy-peer-deps', {
      cwd: workspacePath,
      stdio: 'pipe',
    });

    // Create a plugin using nx generator (it comes with a default generator)
    execSync(`npx nx g @nx/plugin:plugin ${pluginName} --no-interactive`, {
      cwd: workspacePath,
      stdio: 'pipe',
    });

    // Create the secondary entry points structure manually since nx doesn't have a generator for this yet
    await createSecondaryEntryPoints(workspacePath, pluginName);

    // Start the language server
    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(workspacePath);
  });

  describe('regular generator (control test)', () => {
    it('should successfully resolve regular generator options for @nx/js:library', async () => {
      const generatorPath = join(
        e2eCwd,
        workspaceName,
        'node_modules',
        '@nx/js/src/generators/library/schema.json',
      );

      const generatorOptions = await nxlsWrapper.sendRequest({
        ...NxGeneratorOptionsRequest,
        params: {
          options: {
            collection: '@nx/js',
            name: 'library',
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

    it('should discover regular generators in NxGeneratorsRequest', async () => {
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

      // Should find the regular @nx/js:library generator
      const jsLibGenerator = generatorList.find(
        (g) => g.name === '@nx/js:library',
      );
      expect(jsLibGenerator).toBeDefined();
      expect(jsLibGenerator?.type).toBe('generator');
    });
  });

  describe('secondary entry point generators', () => {
    it('should discover secondary entry point generators in NxGeneratorsRequest', async () => {
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

      // Should find both regular and secondary entry point generators
      const defaultGenerator = generatorList.find(
        (g) => g.name === `${pluginName}:${pluginName}`,
      );
      const adaptersGenerator = generatorList.find(
        (g) => g.name === `${pluginName}/adapters:adapter`,
      );

      expect(defaultGenerator).toBeDefined();
      expect(adaptersGenerator).toBeDefined();
    });

    it('should successfully resolve secondary entry point generator options', async () => {
      const secondaryPath = join(
        e2eCwd,
        workspaceName,
        pluginName,
        'src',
        'adapters',
        'generators',
        'adapter',
        'schema.json',
      );

      const generatorOptions = await nxlsWrapper.sendRequest({
        ...NxGeneratorOptionsRequest,
        params: {
          options: {
            collection: `${pluginName}/adapters`,
            name: 'adapter',
            path: secondaryPath,
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

/**
 * Creates secondary entry points structure for the plugin created by nx generators
 */
async function createSecondaryEntryPoints(
  workspacePath: string,
  pluginName: string,
) {
  const pluginPath = join(workspacePath, pluginName);
  const adaptersPath = join(pluginPath, 'src', 'adapters');

  // Create secondary entry point directory structure
  mkdirSync(adaptersPath, { recursive: true });
  mkdirSync(join(adaptersPath, 'generators', 'adapter'), { recursive: true });

  // Update package.json to add exports for secondary entry point
  modifyJsonFile(join(pluginPath, 'package.json'), (packageJson) => {
    packageJson.exports = packageJson.exports || {};
    packageJson.exports['./adapters'] = './src/adapters/index.js';
    return packageJson;
  });

  // Update generators.json to include adapter generator from secondary entry point
  modifyJsonFile(join(pluginPath, 'generators.json'), (generatorsJson) => {
    generatorsJson.generators = generatorsJson.generators || {};
    generatorsJson.generators.adapter = {
      factory: './src/adapters/generators/adapter/index.js',
      schema: './src/adapters/generators/adapter/schema.json',
      description: 'Adapter generator in secondary entry point',
    };
    return generatorsJson;
  });

  // The main generator files are already created by nx, we just need to create the secondary entry point files

  // Create adapters entry point file (for exports)
  writeFileSync(
    join(adaptersPath, 'index.js'),
    `// Secondary entry point for adapters
module.exports = {};`,
  );

  // Secondary generator schema
  writeFileSync(
    join(adaptersPath, 'generators', 'adapter', 'schema.json'),
    JSON.stringify(
      {
        $schema: 'http://json-schema.org/schema',
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Adapter name',
          },
          type: {
            type: 'string',
            description: 'Adapter type',
            enum: ['rest', 'graphql', 'websocket'],
          },
        },
        required: ['name'],
      },
      null,
      2,
    ),
  );

  // Secondary generator implementation
  writeFileSync(
    join(adaptersPath, 'generators', 'adapter', 'index.js'),
    `module.exports = function(tree, options) { return tree; };`,
  );
}
