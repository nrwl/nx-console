import {
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Position } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { NxlsWrapper } from '../nxls-wrapper';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const projectJsonPath = join(
  e2eCwd,
  workspaceName,
  'apps',
  workspaceName,
  'project.json'
);

describe('interpolated path links', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: {
        preset: 'next',
      },
    });
    writeFileSync(
      projectJsonPath,
      JSON.stringify(
        {
          root: `apps/${workspaceName}`,
          targets: {
            build: {},
          },
          interpolatedWorkspace: '{workspaceRoot}/nx.json',
          interpolatedProject: '{projectRoot}/project.json',
        },
        null,
        2
      )
    );
    nxlsWrapper = new NxlsWrapper(true);
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));

    nxlsWrapper.sendNotification({
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: URI.file(projectJsonPath).toString(),
          languageId: 'JSON',
          version: 1,
          text: readFileSync(projectJsonPath, 'utf-8'),
        },
      },
    });
  });
  afterAll(async () => {
    await nxlsWrapper.stopNxls();
  });

  it('should return correct links for {workspaceRoot} and {projectRoot}', async () => {
    const linkResponse = await nxlsWrapper.sendRequest({
      method: 'textDocument/documentLink',
      params: {
        textDocument: {
          uri: URI.file(projectJsonPath).toString(),
        },
        position: Position.create(0, 1),
      },
    });

    const links = linkResponse.result as any[];
    
    const workspaceLink = links.find(l => l.target && l.target.endsWith('nx.json'));
    const projectLink = links.find(l => l.target && l.target.endsWith('project.json'));

    expect(workspaceLink).toBeDefined();
    expect(decodeURI(workspaceLink.target)).toContain(join(workspaceName, 'nx.json'));

    expect(projectLink).toBeDefined();
    expect(decodeURI(projectLink.target)).toContain(join(workspaceName, 'apps', workspaceName, 'project.json'));
  });

  it('should return correct links for negated {workspaceRoot} and {projectRoot}', async () => {
    modifyJsonFile(projectJsonPath, (data) => ({
      ...data,
      interpolatedWorkspace: '!{workspaceRoot}/nx.json',
      interpolatedProject: '!{projectRoot}/project.json',
    }));

    nxlsWrapper.sendNotification({
      method: 'textDocument/didChange',
      params: {
        textDocument: {
          uri: URI.file(projectJsonPath).toString(),
          languageId: 'JSON',
          version: 2,
        },
        contentChanges: [
          {
            text: readFileSync(projectJsonPath, 'utf-8'),
          },
        ],
      },
    });

    const linkResponse = await nxlsWrapper.sendRequest({
      method: 'textDocument/documentLink',
      params: {
        textDocument: {
          uri: URI.file(projectJsonPath).toString(),
        },
        position: Position.create(0, 1),
      },
    });

    const links = linkResponse.result as any[];

    const workspaceLink = links.find(
      (l) => l.target && l.target.endsWith('nx.json')
    );
    const projectLink = links.find(
      (l) => l.target && l.target.endsWith('project.json')
    );

    expect(workspaceLink).toBeDefined();
    expect(decodeURI(workspaceLink.target)).toContain(
      join(workspaceName, 'nx.json')
    );

    expect(projectLink).toBeDefined();
    expect(decodeURI(projectLink.target)).toContain(
      join(workspaceName, 'apps', workspaceName, 'project.json')
    );
  });
});
