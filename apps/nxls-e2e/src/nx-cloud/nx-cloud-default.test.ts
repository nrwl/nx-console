import { join } from 'path';

import { NxlsWrapper } from '../nxls-wrapper';
import {
  defaultVersion,
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '../utils';
import { NxCloudStatusRequest } from '@nx-console/language-server/types';
import { readFileSync, writeFileSync } from 'fs';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const nxJsonPath = join(e2eCwd, workspaceName, 'nx.json');
const nxCloudEnvPath = join(e2eCwd, workspaceName, 'nx-cloud.env');

let oldNxJsonContents: string;

describe('nx cloud', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
      packageManager: 'npm',
      version: defaultVersion,
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
    nxlsWrapper.setVerbose(true);
  });

  it('should return false & no cloud url if not connected to cloud', async () => {
    const cloudStatusResponse = await nxlsWrapper.sendRequest({
      ...NxCloudStatusRequest,
      params: {},
    });

    expect((cloudStatusResponse.result as any).isConnected).toEqual(false);
    expect((cloudStatusResponse.result as any).nxCloudUrl).toBeUndefined();
  });

  describe('connected via nx-cloud.env', () => {
    it('should return true & default cloud url after setting NX_CLOUD_AUTH_TOKEN', async () => {
      writeFileSync(nxCloudEnvPath, 'NX_CLOUD_AUTH_TOKEN="fake-token"');

      const cloudStatusResponse = await nxlsWrapper.sendRequest({
        ...NxCloudStatusRequest,
        params: {},
      });

      expect((cloudStatusResponse.result as any).isConnected).toEqual(true);
      expect((cloudStatusResponse.result as any).nxCloudUrl).toEqual(
        'https://cloud.nx.app'
      );
    });

    it('should return true & custom cloud url after setting NX_CLOUD_AUTH_TOKEN', async () => {
      writeFileSync(
        nxCloudEnvPath,
        'NX_CLOUD_AUTH_TOKEN="fake-token"\nNX_CLOUD_API="https://staging.nx.app"'
      );

      const cloudStatusResponse = await nxlsWrapper.sendRequest({
        ...NxCloudStatusRequest,
        params: {},
      });

      expect((cloudStatusResponse.result as any).isConnected).toEqual(true);
      expect((cloudStatusResponse.result as any).nxCloudUrl).toEqual(
        'https://staging.nx.app'
      );
    });

    afterAll(() => {
      writeFileSync(nxCloudEnvPath, '');
    });
  });

  describe('connected via nx.json', () => {
    beforeEach(() => {
      oldNxJsonContents = readFileSync(nxJsonPath, 'utf-8');
    });
    afterEach(() => {
      writeFileSync(nxJsonPath, oldNxJsonContents);
    });
    it('should return true & default cloud url after setting access token', async () => {
      modifyJsonFile(nxJsonPath, (json) => ({
        ...json,
        nxCloudAccessToken: 'fake-token',
      }));

      const cloudStatusResponse = await nxlsWrapper.sendRequest({
        ...NxCloudStatusRequest,
        params: {},
      });
      expect((cloudStatusResponse.result as any).isConnected).toEqual(true);
      expect((cloudStatusResponse.result as any).nxCloudUrl).toEqual(
        'https://cloud.nx.app'
      );
    });

    it('should return true & custom cloud url after setting access token & cloud url', async () => {
      modifyJsonFile(nxJsonPath, (json) => ({
        ...json,
        nxCloudAccessToken: 'fake-token',
        nxCloudUrl: 'https://staging.nx.app',
      }));

      const cloudStatusResponse = await nxlsWrapper.sendRequest({
        ...NxCloudStatusRequest,
        params: {},
      });
      expect((cloudStatusResponse.result as any).isConnected).toEqual(true);
      expect((cloudStatusResponse.result as any).nxCloudUrl).toEqual(
        'https://staging.nx.app'
      );
    });
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
