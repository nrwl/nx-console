import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import { NxWorkspace } from '@nx-console/shared/types';
import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  e2eCwd,
  newWorkspace,
  NewWorkspaceOptions,
  simpleReactWorkspaceOptions,
  uniq,
} from '../utils';
import { readFileSync, writeFileSync } from 'fs';

export function testNxWorkspace(
  version: string,
  options: NewWorkspaceOptions,
  workspaceName: string,
  expectedProjects: string[],
  expectedTargets: Record<string, string[]>[]
) {
  let nxlsWrapper: NxlsWrapper;

  describe(`nx/workspace - nx ${version}`, () => {
    beforeAll(async () => {
      newWorkspace({
        name: workspaceName,
        options,
        version: version,
      });

      nxlsWrapper = new NxlsWrapper();
      await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
    });
    it('should return projects for simple workspace', async () => {
      const workspaceResponse = await nxlsWrapper.sendRequest({
        ...NxWorkspaceRequest,
        params: {
          reset: false,
        },
      });

      expect(
        Object.keys(
          (workspaceResponse.result as NxWorkspace).workspace.projects
        )
      ).toEqual(expectedProjects);
    });

    it('should return correct targets for simple workspace', async () => {
      const workspaceResponse = await nxlsWrapper.sendRequest({
        ...NxWorkspaceRequest,
        params: {
          reset: false,
        },
      });
      expect(
        Object.entries(
          (workspaceResponse.result as NxWorkspace).workspace.projects
        ).map(([projectName, project]) => ({
          [projectName]: Object.keys(project.targets ?? {}).sort(),
        }))
      ).toEqual(expectedTargets);
    });

    it('should work with comments in nx.json', async () => {
      const nxJsonPath = join(e2eCwd, workspaceName, 'nx.json');
      const oldContents = readFileSync(nxJsonPath, 'utf-8');
      writeFileSync(
        nxJsonPath,
        oldContents.replace('{', '{ // test comment \n'),
        {
          encoding: 'utf-8',
        }
      );

      const workspaceResponse = await nxlsWrapper.sendRequest({
        ...NxWorkspaceRequest,
        params: {
          reset: false,
        },
      });
      expect(
        Object.entries(
          (workspaceResponse.result as NxWorkspace).workspace.projects
        ).map(([projectName, project]) => ({
          [projectName]: Object.keys(project.targets ?? {}).sort(),
        }))
      ).toEqual(expectedTargets);
    });

    afterAll(async () => {
      return await nxlsWrapper.stopNxls();
    });
  });
}
