import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import { newWorkspace, e2eCwd, uniq } from './utils';
import { join } from 'path';
import {
  Message,
  NotificationMessage,
  RequestMessage,
  ResponseMessage,
} from 'vscode-jsonrpc';
import { NxlsWrapper } from './nxls-wrapper';
import { ChildProcess } from 'child_process';
import { NxWorkspace } from '@nx-console/shared/types';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

describe('nxlsE2e', () => {
  beforeAll(() => {
    newWorkspace({ name: workspaceName });

    nxlsWrapper = new NxlsWrapper();
    nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
  });
  it('should work', async () => {
    const workspaceResponse = await nxlsWrapper.sendRequest({
      ...NxWorkspaceRequest,
      params: {
        reset: false,
      },
    });
    console.log('workspaceResponse', workspaceResponse);

    expect(
      Object.keys((workspaceResponse.result as NxWorkspace).workspace.projects)
    ).toEqual(['e2e', workspaceName]);
  });
  afterAll(async () => {
    await nxlsWrapper.stopNxls();
  });
});
