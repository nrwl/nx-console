import { readFileSync } from 'fs';
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
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf-8'));
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
    // Nx 23+ ships schemas under dist/, so resolve the path like nxls does.
    const nxJsRoot = join(e2eCwd, workspaceName, 'node_modules', '@nx/js');
    const schemaPath = join(
      nxJsRoot,
      readJson(join(nxJsRoot, 'generators.json')).generators.library.schema,
    );
    const schema = readJson(schemaPath);
    const schemaProperties: Record<string, any> = schema.properties;
    const required: string[] = schema.required ?? [];

    const generatorOptions = await nxlsWrapper.sendRequest({
      ...NxGeneratorOptionsRequest,
      params: {
        options: {
          collection: '@nx/js',
          name: 'library',
          path: schemaPath,
        } satisfies NxGeneratorOptionsRequestOptions,
      },
    });

    expect(generatorOptions.result).toBeDefined();
    const names = (generatorOptions.result as any[]).map((o) => o.name);

    const visibleOptions = Object.entries(schemaProperties)
      .filter(([, property]) => !property.hidden)
      .map(([name]) => name);
    expect([...names].sort()).toEqual([...visibleOptions].sort());
    expect(names).toEqual(
      expect.arrayContaining(['directory', 'bundler', 'name', 'importPath']),
    );

    // Required options and options marked x-priority: important are listed first.
    const leading = names.filter(
      (name) =>
        required.includes(name) ||
        schemaProperties[name]['x-priority'] === 'important',
    );
    expect(leading.length).toBeGreaterThan(0);
    expect(names.slice(0, leading.length)).toEqual(leading);
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
