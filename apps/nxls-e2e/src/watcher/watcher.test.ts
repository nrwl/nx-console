import {
  NxWorkspaceRefreshNotification,
  NxWorkspaceRequest,
} from '@nx-console/language-server/types';
import { execSync } from 'child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
  waitFor,
} from '../utils';

jest.setTimeout(600000);

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const projectJsonPath = join(e2eCwd, workspaceName, 'project.json');
const e2eProjectJsonPath = join(e2eCwd, workspaceName, 'e2e', 'project.json');
const cypressConfig = join(e2eCwd, workspaceName, 'e2e', 'cypress.config.ts');

process.env['NX_DAEMON'] = 'true';

describe('watcher', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
  });

  afterAll(async () => {
    await nxlsWrapper.stopNxls();
  });

  it('should send refresh notification when project files are changed', async () => {
    await waitFor(500);
    addRandomTargetToFile(projectJsonPath);
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    await waitFor(500);
    addRandomTargetToFile(e2eProjectJsonPath);
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    await waitFor(500);
    addRandomTargetToFile(e2eProjectJsonPath);
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    await waitFor(500);
    appendFileSync(cypressConfig, 'console.log("hello")');
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );
  });

  it('should still get refresh notifications when daemon is stopped for some reason', async () => {
    // if (isWindows()) {
    //   expect(true).toBe(true);
    //   return;
    // }

    execSync('npx nx daemon --stop', {
      cwd: join(e2eCwd, workspaceName),
      windowsHide: true,
      env: process.env,
    });

    // give nxls a second to restart the daemon
    await waitFor(6000);

    addRandomTargetToFile(projectJsonPath);
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );
  });

  it('should send 4 refresh notifications after error and still handle changes', async () => {
    await waitFor(2000);
    const oldContents = readFileSync(projectJsonPath, 'utf-8');
    writeFileSync(projectJsonPath, 'invalid json', {
      encoding: 'utf-8',
    });
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    // we need to wait until the daemon watcher ultimately fails
    // and the native watcher is started
    await waitFor(8000);
    writeFileSync(projectJsonPath, oldContents);
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );
  });

  it('should not send refresh notification when project files are not changed', async () => {
    const workspace = await nxlsWrapper.sendRequest({
      ...NxWorkspaceRequest,
      params: {
        reset: false,
      },
    });
    expect(workspace).toBeTruthy();

    nxlsWrapper
      .waitForNotification(NxWorkspaceRefreshNotification.method)
      .then(() => {
        throw new Error('Should not have received refresh notification');
      });

    await waitFor(11000);
    nxlsWrapper.cancelWaitingForNotification(
      NxWorkspaceRefreshNotification.method
    );
  });

  it('should send refresh notification after generating a new project and changing one of its files', async () => {
    await new Promise<void>((resolve) => {
      nxlsWrapper
        .waitForNotification(NxWorkspaceRefreshNotification.method)
        .then(() => {
          resolve();
        });

      try {
        execSync(
          'npx nx g @nx/react:app --directory react-app1 --no-interactive --verbose',
          {
            cwd: join(e2eCwd, workspaceName),
            env: process.env,
          }
        );
      } catch (e) {
        console.log('Error: ', e);
      }
    });

    await waitFor(1000);

    addRandomTargetToFile(
      join(e2eCwd, workspaceName, 'react-app1', 'project.json')
    );
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );
  });
});

function addRandomTargetToFile(path: string) {
  modifyJsonFile(path, (data) => ({
    ...data,
    targets: {
      ...data.targets,
      [uniq('target')]: {
        executor: 'nx:noop',
      },
    },
  }));
}
