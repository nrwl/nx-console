import { NxCloudOnboardingInfoRequest } from '@nx-console/language-server-types';
import {
  defaultVersion,
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { CloudOnboardingInfo } from '@nx-console/shared-types';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const nxJsonPath = join(e2eCwd, workspaceName, 'nx.json');
let defaultNxJsonContents: string;

describe('nx cloud onboarding - default', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
      packageManager: 'npm',
      version: defaultVersion,
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
    defaultNxJsonContents = readFileSync(nxJsonPath, 'utf-8');
  });

  beforeEach(() => {
    writeFileSync(nxJsonPath, defaultNxJsonContents);
  });

  it('should return false for all onboarding info in unconnected workspace', async () => {
    const onboardingInfoResponse = await nxlsWrapper.sendRequest({
      ...NxCloudOnboardingInfoRequest,
      params: {},
    });
    const info = onboardingInfoResponse.result as CloudOnboardingInfo;

    // we check everything except isWorkspaceClaimed becasue that depends on things outside of our control (the internet)
    expect(info.isConnectedToCloud).toEqual(false);
    expect(info.hasNxInCI).toEqual(false);
  });

  it('should return connected true with access token', async () => {
    modifyJsonFile(nxJsonPath, (data) => ({
      ...data,
      nxCloudAccessToken: 'DUMMY_TOKEN',
    }));

    const onboardingInfoResponse = await nxlsWrapper.sendRequest({
      ...NxCloudOnboardingInfoRequest,
      params: {},
    });

    const info = onboardingInfoResponse.result as CloudOnboardingInfo;
    expect(info.isConnectedToCloud).toEqual(true);
  });

  it('should return connected true with nxCloudId', async () => {
    modifyJsonFile(nxJsonPath, (data) => ({
      ...data,
      nxCloudId: 'DUMMY_ID',
    }));

    const onboardingInfoResponse = await nxlsWrapper.sendRequest({
      ...NxCloudOnboardingInfoRequest,
      params: {},
    });

    const info = onboardingInfoResponse.result as CloudOnboardingInfo;
    expect(info.isConnectedToCloud).toEqual(true);
  });

  it('should return connected true with nxCloudId in taskRunnerOptions', async () => {
    modifyJsonFile(nxJsonPath, (data) => ({
      ...data,
      tasksRunnerOptions: {
        default: {
          runner: 'nx-cloud',
          options: {
            nxCloudId: 'DUMMY_ID',
          },
        },
      },
    }));

    const onboardingInfoResponse = await nxlsWrapper.sendRequest({
      ...NxCloudOnboardingInfoRequest,
      params: {},
    });

    const info = onboardingInfoResponse.result as CloudOnboardingInfo;
    expect(info.isConnectedToCloud).toEqual(true);
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });

  it('should return true for CI checks after generating workflow', async () => {
    execSync(`npx nx g @nx/workspace:ci-workflow --ci github --name gh-ci`, {
      cwd: join(e2eCwd, workspaceName),
    });

    const onboardingInfoResponse = await nxlsWrapper.sendRequest({
      ...NxCloudOnboardingInfoRequest,
      params: {},
    });

    const info = onboardingInfoResponse.result as CloudOnboardingInfo;

    expect(info.hasNxInCI).toEqual(true);
  });
});
