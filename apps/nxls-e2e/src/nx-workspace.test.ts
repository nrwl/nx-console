import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import { NxWorkspace } from '@nx-console/shared/types';
import { join } from 'path';
import { NxlsWrapper } from './nxls-wrapper';
import {
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from './utils';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

describe('nx/workspace', () => {
  beforeAll(() => {
    newWorkspace({ name: workspaceName, options: simpleReactWorkspaceOptions });

    nxlsWrapper = new NxlsWrapper();
    nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
  });
  it('should return projects for simple workspace', async () => {
    const workspaceResponse = await nxlsWrapper.sendRequest({
      ...NxWorkspaceRequest,
      params: {
        reset: false,
      },
    });

    expect(
      Object.keys((workspaceResponse.result as NxWorkspace).workspace.projects)
    ).toEqual(['e2e', workspaceName]);
  });
  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
