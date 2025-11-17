import {
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '@nx-console/shared-e2e-utils';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Position } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { NxlsWrapper } from '../nxls-wrapper';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');
const e2eProjectName = `${workspaceName}-e2e`;

const projectJsonPath = join(e2eCwd, workspaceName, 'project.json');
const e2eProjectJsonPath = join(
  e2eCwd,
  workspaceName,
  e2eProjectName,
  'project.json',
);

describe('document link completion - project links', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
    });

    writeFileSync(
      e2eProjectJsonPath,
      JSON.stringify(
        {
          implicitDependencies: [e2eProjectName],
        },
        null,
        2,
      ),
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

  describe('project links', () => {
    it('should return correct link for valid project in implicitDependencies', async () => {
      modifyJsonFile(projectJsonPath, (data) => ({
        ...data,
        implicitDependencies: [e2eProjectName],
      }));

      nxlsWrapper.sendNotification({
        method: 'textDocument/didChange',
        params: {
          textDocument: {
            uri: URI.file(e2eProjectJsonPath).toString(),
            languageId: 'JSON',
            version: 2,
          },
          contentChanges: [
            {
              text: readFileSync(e2eProjectJsonPath, 'utf-8'),
            },
          ],
        },
      });

      const linkResponse = await nxlsWrapper.sendRequest({
        method: 'textDocument/documentLink',
        params: {
          textDocument: {
            uri: URI.file(e2eProjectJsonPath).toString(),
          },
          position: Position.create(1, 4),
        },
      });

      const projectLink = (linkResponse.result as any[])[0]?.target;
      expect(projectLink).toBeDefined();
      expect(decodeURI(projectLink)).toContain(projectJsonPath);
      expect(projectLink).toMatch(/#1$/);
    });

    it('should return correct link for project with ! prefix in implicitDependencies', async () => {
      modifyJsonFile(projectJsonPath, (data) => ({
        ...data,
        implicitDependencies: [`!${workspaceName}`],
      }));

      nxlsWrapper.sendNotification({
        method: 'textDocument/didChange',
        params: {
          textDocument: {
            uri: URI.file(e2eProjectJsonPath).toString(),
            languageId: 'JSON',
            version: 3,
          },
          contentChanges: [
            {
              text: readFileSync(e2eProjectJsonPath, 'utf-8'),
            },
          ],
        },
      });

      const linkResponse = await nxlsWrapper.sendRequest({
        method: 'textDocument/documentLink',
        params: {
          textDocument: {
            uri: URI.file(e2eProjectJsonPath).toString(),
          },
          position: Position.create(1, 4),
        },
      });

      const projectLink = (linkResponse.result as any[])[0]?.target;
      expect(projectLink).toBeDefined();
      expect(decodeURI(projectLink)).toContain(projectJsonPath);
      expect(projectLink).toMatch(/#1$/);
    });

    it('should not return link for non-existent project in implicitDependencies', async () => {
      modifyJsonFile(e2eProjectJsonPath, (data) => ({
        ...data,
        implicitDependencies: ['non-existent-project'],
      }));

      nxlsWrapper.sendNotification({
        method: 'textDocument/didChange',
        params: {
          textDocument: {
            uri: URI.file(e2eProjectJsonPath).toString(),
            languageId: 'JSON',
            version: 4,
          },
          contentChanges: [
            {
              text: readFileSync(e2eProjectJsonPath, 'utf-8'),
            },
          ],
        },
      });

      const linkResponse = await nxlsWrapper.sendRequest({
        method: 'textDocument/documentLink',
        params: {
          textDocument: {
            uri: URI.file(e2eProjectJsonPath).toString(),
          },
          position: Position.create(1, 4),
        },
      });

      const links = linkResponse.result as any[];
      expect(links).toEqual([]);
    });
  });
});
