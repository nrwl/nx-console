import {
  NxGeneratorOptionsRequest,
  NxGeneratorOptionsRequestOptions,
} from '@nx-console/language-server-types';
import {
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { Option } from '@nx-console/shared-schema';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';

const nxVersion = '22.7.0-beta.17';
const workspaceName = uniq('workspace');
const workspacePath = join(e2eCwd, workspaceName);
const convertToSwcSchemaPath = join(
  workspacePath,
  'node_modules',
  '@nx',
  'js',
  'src',
  'generators',
  'convert-to-swc',
  'schema.json',
);

let nxlsWrapper: NxlsWrapper;

describe(`generator options - nx ${nxVersion}`, () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
      version: nxVersion,
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(workspacePath);
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls(nxVersion);
  });

  it('should clear unsupported JSON schema items objects from normalized options', async () => {
    const schema = JSON.parse(readFileSync(convertToSwcSchemaPath, 'utf-8'));
    expect(Array.isArray(schema.properties.targets.items)).toBe(false);
    expect(schema.properties.targets.items).toMatchObject({
      type: 'string',
    });

    const generatorOptions = await nxlsWrapper.sendRequest({
      ...NxGeneratorOptionsRequest,
      params: {
        options: {
          collection: '@nx/js',
          name: 'convert-to-swc',
          path: convertToSwcSchemaPath,
        } satisfies NxGeneratorOptionsRequestOptions,
      },
    });
    const options = generatorOptions.result as Option[];

    const targetsOption = options.find((option) => option.name === 'targets');
    expect(targetsOption).toBeDefined();
    expect(targetsOption?.type).toEqual('array');
    expect(targetsOption?.default).toEqual(['build']);
    expect(targetsOption?.items).toBeUndefined();
  });
});
