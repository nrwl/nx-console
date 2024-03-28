import {
  NxWorkspaceRefreshNotification,
  NxWorkspaceRequest,
} from '@nx-console/language-server/types';
import { execSync } from 'child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NxlsWrapper } from './nxls-wrapper';
import {
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
  waitFor,
} from './utils';
let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const projectJsonPath = join(e2eCwd, workspaceName, 'project.json');
const e2eProjectJsonPath = join(e2eCwd, workspaceName, 'e2e', 'project.json');
const cypressConfig = join(e2eCwd, workspaceName, 'e2e', 'cypress.config.ts');

process.env['NX_DAEMON'] = 'true';

describe('watcher', () => {
  beforeAll(async () => {
    newWorkspace({ name: workspaceName, options: simpleReactWorkspaceOptions });

    nxlsWrapper = new NxlsWrapper(false);
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
  });

  it('should send refresh notification when project files are changed', async () => {
    addRandomTargetToFile(projectJsonPath);
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    addRandomTargetToFile(e2eProjectJsonPath);
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    addRandomTargetToFile(e2eProjectJsonPath);
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    appendFileSync(cypressConfig, 'console.log("hello")');
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );
  });

  it('should detect daemon shutdown and restart watcher automatically', async () => {
    nxlsWrapper.setVerbose(true);
    console.log('DAEMON TEST +++++++++++++++');
    execSync('npx nx daemon --stop', {
      cwd: join(e2eCwd, workspaceName),
      windowsHide: true,
      env: process.env,
    });

    // give nxls a second to restart
    await waitFor(1000);

    addRandomTargetToFile(projectJsonPath);
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );
    console.log('DAEMON TEST END +++++++++++++++');
  });

  it('should send 4 refresh notifications after error and still handle changes', async () => {
    console.log('starting next test');
    nxlsWrapper.setVerbose(false);
    const oldContents = readFileSync(projectJsonPath, 'utf-8');
    writeFileSync(projectJsonPath, 'invalid json');
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
    await waitFor(7000);
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

    await waitFor(10000);
  });

  it('should send refresh notification after generating a new project and changing one of its files', async () => {
    await new Promise<void>((resolve) => {
      nxlsWrapper
        .waitForNotification(NxWorkspaceRefreshNotification.method)
        .then(() => {
          resolve();
        });
      execSync('npx nx g @nx/react:app --name react-app1 --no-interactive', {
        cwd: join(e2eCwd, workspaceName),
        env: process.env,
      });
    });

    addRandomTargetToFile(
      join(e2eCwd, workspaceName, 'react-app1', 'project.json')
    );
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
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
