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
import { NxWorkspaceRefreshNotification } from '@nx-console/language-server-types';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const projectJsonPath = join(
  e2eCwd,
  workspaceName,
  'apps',
  workspaceName,
  'project.json',
);

describe('document link completion - default', () => {
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
          targets: {
            build: {},
          },
        },
        null,
        2,
      ),
    );
    nxlsWrapper = new NxlsWrapper(true);
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));

    // Wait for the full workspace configuration to load
    // This ensures the project graph is available for all tests
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method,
    );

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
  describe('target links', () => {
    it('should return correct target link for x-completion-type:projectTarget if build target is specified in project.json', async () => {
      modifyJsonFile(projectJsonPath, (data) => ({
        ...data,
        targets: {
          ...data.targets,
          build: {},
          serve: {
            executor: '@nx/next:server',
            options: {
              buildTarget: `@${workspaceName}/${workspaceName}:build`,
            },
          },
        },
      }));

      const buildLine =
        readFileSync(projectJsonPath, 'utf-8')
          .split('\n')
          .findIndex((line) => line.includes('"build": {}')) + 1;

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

      const targetLink = (linkResponse.result as any[])[0].target;
      expect(targetLink).toMatch(new RegExp(`#${buildLine}$`));
      expect(decodeURI(targetLink)).toContain(
        join('apps', workspaceName, 'project.json'),
      );
    });
    it('should return correct target link for x-completion-type:projectTarget if no build target is specified in project.json', async () => {
      // This test depends on the workspace configuration loaded in the first test
      modifyJsonFile(projectJsonPath, (data) => {
        delete data.targets.build;
        return data;
      });

      const targetsLine =
        readFileSync(projectJsonPath, 'utf-8')
          .split('\n')
          .findIndex((line) => line.includes('"targets": {')) + 1;

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
      const targetLink = (linkResponse.result as any[])[0].target;
      expect(targetLink).toMatch(new RegExp(`#${targetsLine}$`));
      expect(decodeURI(targetLink)).toContain(
        join('apps', workspaceName, 'project.json'),
      );
    });
  });
});
