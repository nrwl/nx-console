import { NxProjectsByPathsRequest } from '@nx-console/language-server-types';
import {
  defaultVersion,
  e2eCwd,
  newWorkspace,
  uniq,
} from '@nx-console/shared-e2e-utils';
import type { ProjectConfiguration } from 'nx/src/devkit-exports';
import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

describe('projects by paths', () => {
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

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
  });

  it('should return projects for multiple paths', async () => {
    const appPackageJson = join(
      e2eCwd,
      workspaceName,
      'apps',
      workspaceName,
      'package.json',
    );

    const e2ePackageJson = join(
      e2eCwd,
      workspaceName,
      'apps',
      `${workspaceName}-e2e`,
      'package.json',
    );

    const result = await nxlsWrapper.sendRequest({
      ...NxProjectsByPathsRequest,
      params: {
        paths: [appPackageJson, e2ePackageJson],
      },
    });

    const projectsMap = result.result as {
      [path: string]: ProjectConfiguration | undefined;
    };

    expect(projectsMap[appPackageJson]?.name).toEqual(
      `@${workspaceName}/${workspaceName}`,
    );
    expect(projectsMap[e2ePackageJson]?.name).toEqual(
      `@${workspaceName}/${workspaceName}-e2e`,
    );
  });

  it('should return undefined for paths not in any project', async () => {
    const nxJson = join(e2eCwd, workspaceName, 'nx.json');

    const result = await nxlsWrapper.sendRequest({
      ...NxProjectsByPathsRequest,
      params: {
        paths: [nxJson],
      },
    });

    const projectsMap = result.result as {
      [path: string]: ProjectConfiguration | undefined;
    };

    expect(projectsMap[nxJson]).toBeUndefined();
  });

  afterAll(async () => {
    return await nxlsWrapper.stopNxls();
  });
});
