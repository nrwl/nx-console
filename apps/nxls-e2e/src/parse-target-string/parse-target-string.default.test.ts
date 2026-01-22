import { NxParseTargetStringRequest } from '@nx-console/language-server-types';
import type { Target } from 'nx/src/devkit-exports';
import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  defaultVersion,
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  uniq,
  waitFor,
} from '@nx-console/shared-e2e-utils';
import { writeFileSync } from 'fs';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');
const projectName = `@${workspaceName}/${workspaceName}`;

describe('parse target string - default', () => {
  beforeAll(async () => {
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
    const projectJson = join(
      e2eCwd,
      workspaceName,
      'apps',
      workspaceName,
      'project.json',
    );
    writeFileSync(
      projectJson,
      JSON.stringify(
        {
          targets: {
            build: {},
          },
        },
        null,
        2,
      ),
    );

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
    nxlsWrapper.setVerbose(true);

    await waitFor(5000);
    modifyJsonFile(projectJson, (json) => ({
      ...json,
      targets: {
        ...json.targets,
        build: {
          ...json.targets.build,
          configurations: {
            prod: {
              options: {
                mode: 'production',
              },
            },
            dev: {
              options: {
                mode: 'development',
              },
            },
            'with:colon': {
              options: {
                mode: 'with:colon',
              },
            },
          },
        },
        'build:webpack': {
          command: 'webpack .',
          configurations: {
            prod: {
              options: {
                mode: 'production',
              },
            },
          },
        },
        'lint:ci': {
          command: 'eslint .',
          configurations: {
            fix: {
              command: 'eslint . --fix',
            },
          },
        },
        lint: {
          ...json.targets.lint,
          configurations: {
            ci: {
              options: {
                ci: true,
              },
            },
          },
        },
      },
    }));

    await nxlsWrapper.triggerAndWaitForRefresh();
  });

  it('should correctly parse simple target string', async () => {
    const target = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:build` as any,
    });

    expect(target.result as Target).toEqual({
      project: projectName,
      target: 'build',
    });
  });

  it('should correctly parse target string with configurations', async () => {
    // existing configurations
    const target = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:build:prod` as any,
    });

    expect(target.result as Target).toEqual({
      project: projectName,
      target: 'build',
      configuration: 'prod',
    });

    const target2 = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:build:dev` as any,
    });

    expect(target2.result as Target).toEqual({
      project: projectName,
      target: 'build',
      configuration: 'dev',
    });

    // nonexisting configuration
    const target3 = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:build:unknown` as any,
    });

    expect(target3.result as Target).toEqual({
      project: projectName,
      target: 'build',
      configuration: 'unknown',
    });
  });

  it('should correctly parse target string with : in target name', async () => {
    const target = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:build:webpack` as any,
    });

    expect(target.result as Target).toEqual({
      project: projectName,
      target: 'build:webpack',
    });

    // existing configuration
    const target2 = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:build:webpack:prod` as any,
    });

    expect(target2.result as Target).toEqual({
      project: projectName,
      target: 'build:webpack',
      configuration: 'prod',
    });

    // nonexisting configuration
    const target3 = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:build:webpack:unknown` as any,
    });

    expect(target3.result as Target).toEqual({
      project: projectName,
      target: 'build:webpack',
      configuration: 'unknown',
    });
  });

  it('should correctly parse target string with : in configuration name', async () => {
    const target = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:build:with:colon` as any,
    });

    expect(target.result as Target).toEqual({
      project: projectName,
      target: 'build',
      configuration: 'with:colon',
    });
  });

  it('should correctly parse target string with : in target and multiple combination options', async () => {
    const target = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:lint:ci` as any,
    });

    expect(target.result as Target).toEqual({
      project: projectName,
      target: 'lint:ci',
    });

    const target2 = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:lint:ci:fix` as any,
    });

    expect(target2.result as Target).toEqual({
      project: projectName,
      target: 'lint:ci',
      configuration: 'fix',
    });

    const target3 = await nxlsWrapper.sendRequest({
      ...NxParseTargetStringRequest,
      params: `${projectName}:lint:ci:unknown` as any,
    });

    expect(target3.result as Target).toEqual({
      project: projectName,
      target: 'lint:ci',
      configuration: 'unknown',
    });
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
