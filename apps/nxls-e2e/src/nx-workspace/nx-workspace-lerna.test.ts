import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import { e2eCwd, uniq } from '../utils';
import { mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import { NxWorkspace } from '@nx-console/shared/types';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const workspacePath = join(e2eCwd, workspaceName);
describe('nx/workspace - lerna.json only repo', () => {
  beforeAll(async () => {
    mkdirSync(workspacePath, { recursive: true });
    execSync('npx lerna init', {
      cwd: workspacePath,
    });
    const packagesDir = join(workspacePath, 'packages');

    mkdirSync(packagesDir);
    mkdirSync(join(packagesDir, 'project-1'));
    writeFileSync(
      join(packagesDir, 'project-1', 'package.json'),
      `
        {
            "scripts": {
                "echo-1": "echo 1"
            }
        }`
    );
    mkdirSync(join(packagesDir, 'project-2'));
    writeFileSync(
      join(packagesDir, 'project-2', 'package.json'),
      `
    {
        "scripts": {
            "echo-2": "echo 2"
        }
    }`
    );
    mkdirSync(join(packagesDir, 'project-3'));
    writeFileSync(
      join(packagesDir, 'project-3', 'package.json'),
      `
    {
        "scripts": {
            "echo-3": "echo 3"
        }
    }`
    );

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(workspacePath);
  });

  afterAll(async () => {
    await nxlsWrapper.stopNxls();
  });

  it('should return correct projects for lerna workspace', async () => {
    const workspaceResponse = await nxlsWrapper.sendRequest({
      ...NxWorkspaceRequest,
      params: {
        reset: false,
      },
    });

    expect(
      Object.keys((workspaceResponse.result as NxWorkspace).workspace.projects)
    ).toEqual(['project-1', 'project-2', 'project-3']);
  });
  it('should return correct targets for lerna workspace', async () => {
    const workspaceResponse = await nxlsWrapper.sendRequest({
      ...NxWorkspaceRequest,
      params: {
        reset: false,
      },
    });

    const projects = (workspaceResponse.result as NxWorkspace).workspace
      .projects;

    expect(Object.keys(projects['project-1']?.targets ?? {}))
      .toMatchInlineSnapshot(`
      Array [
        "echo-1",
        "nx-release-publish",
      ]
    `);
    expect(Object.keys(projects['project-2']?.targets ?? {}))
      .toMatchInlineSnapshot(`
      Array [
        "echo-2",
        "nx-release-publish",
      ]
    `);
    expect(Object.keys(projects['project-3']?.targets ?? {}))
      .toMatchInlineSnapshot(`
      Array [
        "echo-3",
        "nx-release-publish",
      ]
    `);
  });
});
