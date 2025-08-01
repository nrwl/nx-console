import { join } from 'path';
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
const pluginName = '@test-org/test-plugin';

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

    // Create a test plugin with secondary entry points
    await createTestPluginWithSecondaryEntryPoints(workspacePath, pluginName);

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
      const mainGenerator = generatorList.find(
        (g) => g.name === `${pluginName}:main`,
      );
      const adaptersGenerator = generatorList.find(
        (g) => g.name === `${pluginName}/adapters:adapter`,
      );

      expect(mainGenerator).toBeDefined();
      expect(adaptersGenerator).toBeDefined();
    });

    it('should successfully resolve secondary entry point generator options', async () => {
      const secondaryPath = join(
        e2eCwd,
        workspaceName,
        'node_modules',
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
 * Creates a test plugin with secondary entry points to simulate the real-world scenario
 */
async function createTestPluginWithSecondaryEntryPoints(
  workspacePath: string,
  pluginName: string,
) {
  const pluginPath = join(workspacePath, 'node_modules', pluginName);
  const adaptersPath = join(pluginPath, 'src', 'adapters');

  // Create plugin directory structure
  mkdirSync(pluginPath, { recursive: true });
  mkdirSync(adaptersPath, { recursive: true });
  mkdirSync(join(pluginPath, 'generators', 'main'), { recursive: true });
  mkdirSync(join(adaptersPath, 'generators', 'adapter'), { recursive: true });

  // Main package.json with exports for secondary entry point
  writeFileSync(
    join(pluginPath, 'package.json'),
    JSON.stringify(
      {
        name: pluginName,
        version: '1.0.0',
        generators: './generators.json',
        exports: {
          './adapters': './src/adapters/index.js',
        },
      },
      null,
      2,
    ),
  );

  // Main generators.json with both main and adapter generators
  writeFileSync(
    join(pluginPath, 'generators.json'),
    JSON.stringify(
      {
        generators: {
          main: {
            factory: './generators/main/index.js',
            schema: './generators/main/schema.json',
            description: 'Main generator',
          },
          adapter: {
            factory: './src/adapters/generators/adapter/index.js',
            schema: './src/adapters/generators/adapter/schema.json',
            description: 'Adapter generator in secondary entry point',
          },
        },
      },
      null,
      2,
    ),
  );

  // Main generator schema
  writeFileSync(
    join(pluginPath, 'generators', 'main', 'schema.json'),
    JSON.stringify(
      {
        $schema: 'http://json-schema.org/schema',
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Library name',
          },
        },
        required: ['name'],
      },
      null,
      2,
    ),
  );

  // Main generator implementation
  writeFileSync(
    join(pluginPath, 'generators', 'main', 'index.js'),
    `module.exports = function(tree, options) { return tree; };`,
  );

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

  // Add the plugin to the workspace dependencies
  modifyJsonFile(join(workspacePath, 'package.json'), (packageJson) => {
    packageJson.devDependencies = packageJson.devDependencies || {};
    packageJson.devDependencies[pluginName] =
      'file:./node_modules/' + pluginName;
    return packageJson;
  });
}
