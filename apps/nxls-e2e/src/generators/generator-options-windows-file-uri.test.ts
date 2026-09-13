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

describe('generator options - Windows file URI handling', () => {
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

  it('should handle Windows file URIs with file:// prefix correctly', async () => {
    const schemaPath = join(
      e2eCwd,
      workspaceName,
      'node_modules',
      '@nx/js/src/generators/library/schema.json',
    );

    // Test with Windows-style file URI (simulating what happens on Windows)
    const windowsFileUri = `file:///${schemaPath.replace(/\\/g, '/')}`;

    const generatorOptions = await nxlsWrapper.sendRequest({
      ...NxGeneratorOptionsRequest,
      params: {
        options: {
          collection: '@nx/js',
          name: 'library',
          path: windowsFileUri,
        } satisfies NxGeneratorOptionsRequestOptions,
      },
    });

    // Verify the result is successful and contains expected options
    expect(generatorOptions.result).toBeDefined();
    expect(generatorOptions.error).toBeUndefined();

    const options = generatorOptions.result as any[];
    expect(options.length).toBeGreaterThan(0);

    // Check for some expected options to ensure the schema was loaded correctly
    const optionNames = options.map((o) => o.name);
    expect(optionNames).toContain('name');
    expect(optionNames).toContain('directory');
    expect(optionNames).toContain('bundler');
  });

  it('should handle Windows file URIs with /c:/ pattern', async () => {
    // Only run this test on Windows or in CI
    if (process.platform !== 'win32' && !process.env.CI) {
      console.log(
        'Skipping Windows-specific path test on non-Windows platform',
      );
      return;
    }

    const schemaPath = join(
      e2eCwd,
      workspaceName,
      'node_modules',
      '@nx/js/src/generators/library/schema.json',
    );

    // Create a Windows-style path with /c:/ pattern
    // This simulates the exact issue that was fixed
    const windowsDriveLetter = schemaPath.match(/^([a-zA-Z]):/)?.[1] || 'c';
    const pathWithoutDrive = schemaPath.replace(/^[a-zA-Z]:/, '');
    const problematicWindowsUri = `file:///${windowsDriveLetter}:${pathWithoutDrive.replace(/\\/g, '/')}`;

    const generatorOptions = await nxlsWrapper.sendRequest({
      ...NxGeneratorOptionsRequest,
      params: {
        options: {
          collection: '@nx/js',
          name: 'library',
          path: problematicWindowsUri,
        } satisfies NxGeneratorOptionsRequestOptions,
      },
    });

    // The fix should handle this correctly
    expect(generatorOptions.result).toBeDefined();
    expect(generatorOptions.error).toBeUndefined();

    const options = generatorOptions.result as any[];
    expect(options.length).toBeGreaterThan(0);
  });

  it('should handle regular file paths without file:// prefix', async () => {
    const schemaPath = join(
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
          path: schemaPath,
        } satisfies NxGeneratorOptionsRequestOptions,
      },
    });

    // Should work with regular paths too
    expect(generatorOptions.result).toBeDefined();
    expect(generatorOptions.error).toBeUndefined();

    const options = generatorOptions.result as any[];
    expect(options.length).toBeGreaterThan(0);
  });

  it('should return error for non-existent schema file with file:// URI', async () => {
    const nonExistentPath = join(
      e2eCwd,
      workspaceName,
      'node_modules',
      '@nx/js/src/generators/non-existent/schema.json',
    );

    const windowsFileUri = `file:///${nonExistentPath.replace(/\\/g, '/')}`;

    const generatorOptions = await nxlsWrapper.sendRequest({
      ...NxGeneratorOptionsRequest,
      params: {
        options: {
          collection: '@nx/js',
          name: 'non-existent',
          path: windowsFileUri,
        } satisfies NxGeneratorOptionsRequestOptions,
      },
    });

    // Should handle errors gracefully
    expect(generatorOptions.error).toBeDefined();
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
