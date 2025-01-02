import { NxProjectByPathRequest } from '@nx-console/language-server-types';
import type { ProjectConfiguration } from 'nx/src/devkit-exports';
import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  defaultVersion,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '../utils';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

describe('project by path - standalone', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
      version: defaultVersion,
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
    nxlsWrapper.setVerbose(true);
  });

  it('should return default project for files in it', async () => {
    const projectJson = join(e2eCwd, workspaceName, 'project.json');

    const projectInfo = await nxlsWrapper.sendRequest({
      ...NxProjectByPathRequest,
      params: {
        projectPath: projectJson,
      },
    });

    expect((projectInfo.result as ProjectConfiguration).name).toEqual(
      workspaceName
    );

    const mainTsx = join(e2eCwd, workspaceName, 'src', 'main.tsx');

    const projectInfo2 = await nxlsWrapper.sendRequest({
      ...NxProjectByPathRequest,
      params: {
        projectPath: mainTsx,
      },
    });

    expect((projectInfo2.result as ProjectConfiguration).name).toEqual(
      workspaceName
    );
  });

  it('should return e2e project for files in it', async () => {
    const projectJson = join(e2eCwd, workspaceName, 'e2e', 'project.json');

    const projectInfo = await nxlsWrapper.sendRequest({
      ...NxProjectByPathRequest,
      params: {
        projectPath: projectJson,
      },
    });

    expect((projectInfo.result as ProjectConfiguration).name).toEqual('e2e');

    const cypressConfig = join(
      e2eCwd,
      workspaceName,
      'e2e',
      'cypress.config.ts'
    );

    const projectInfo2 = await nxlsWrapper.sendRequest({
      ...NxProjectByPathRequest,
      params: {
        projectPath: cypressConfig,
      },
    });

    expect((projectInfo2.result as ProjectConfiguration).name).toEqual('e2e');
  });

  it('should return root project for root file', async () => {
    const nxJson = join(e2eCwd, workspaceName, 'nx.json');
    const projectInfo = await nxlsWrapper.sendRequest({
      ...NxProjectByPathRequest,
      params: {
        projectPath: nxJson,
      },
    });

    expect((projectInfo.result as ProjectConfiguration).name).toEqual(
      workspaceName
    );
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
