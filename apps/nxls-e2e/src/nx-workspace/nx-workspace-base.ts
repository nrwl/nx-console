import { NxWorkspaceRequest } from '@nx-console/language-server-types';
import {
  e2eCwd,
  newWorkspace,
  NewWorkspaceOptions,
} from '@nx-console/shared-e2e-utils';
import { NxWorkspace } from '@nx-console/shared-types';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';

// Nx versions add inferred targets over time (for example test-ci in Nx 24), so each project only
// has to contain the expected targets.
function containingTargets(expectedTargets: Record<string, string[]>[]) {
  return expectedTargets.map((project) =>
    Object.fromEntries(
      Object.entries(project).map(([name, targets]) => [
        name,
        expect.arrayContaining(targets),
      ]),
    ),
  );
}

export function testNxWorkspace(
  version: string,
  options: NewWorkspaceOptions,
  workspaceName: string,
  expectedProjects: string[],
  expectedTargets: Record<string, string[]>[],
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
          (workspaceResponse.result as NxWorkspace).projectGraph.nodes,
        ),
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
          (workspaceResponse.result as NxWorkspace).projectGraph.nodes,
        ).map(([projectName, project]) => ({
          [projectName]: Object.keys(project.data.targets ?? {}).sort(),
        })),
      ).toEqual(containingTargets(expectedTargets));
    });

    it('should work with comments in nx.json', async () => {
      const nxJsonPath = join(e2eCwd, workspaceName, 'nx.json');
      const oldContents = readFileSync(nxJsonPath, 'utf-8');
      writeFileSync(
        nxJsonPath,
        oldContents.replace('{', '{ // test comment \n'),
        {
          encoding: 'utf-8',
        },
      );

      const workspaceResponse = await nxlsWrapper.sendRequest({
        ...NxWorkspaceRequest,
        params: {
          reset: false,
        },
      });
      expect(
        Object.entries(
          (workspaceResponse.result as NxWorkspace).projectGraph.nodes,
        ).map(([projectName, project]) => ({
          [projectName]: Object.keys(project.data.targets ?? {}).sort(),
        })),
      ).toEqual(containingTargets(expectedTargets));
    });

    afterAll(async () => {
      return await nxlsWrapper.stopNxls(version);
    });
  });
}
