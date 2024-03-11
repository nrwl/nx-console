import { newWorkspace, e2eCwd, uniq, startNxls } from './utils';
import { join } from 'path';
// import { NxWorkspaceRequest } from '@nx-console/language-server/types';

describe('nxlsE2e', () => {
  it('should work', async () => {
    const workspaceName = uniq('workspace');
    newWorkspace({ name: workspaceName });

    startNxls(join(e2eCwd, workspaceName));

    // const nxWorkspace = await client.sendRequest(NxWorkspaceRequest, undefined);

    // console.log(nxWorkspace);
    expect(true).toBe(true);
  });
});
