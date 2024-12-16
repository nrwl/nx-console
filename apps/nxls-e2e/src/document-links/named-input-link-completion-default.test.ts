import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
} from '../utils';
import { NxWorkspaceRefreshNotification } from '@nx-console/language-server/types';
import { readFileSync } from 'fs';
import { URI } from 'vscode-uri';
import { Position } from 'vscode-languageserver';
import { fileURLToPath } from 'url';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const projectJsonPath = join(
  e2eCwd,
  workspaceName,
  'apps',
  workspaceName,
  'project.json'
);

describe('namedInput link completion - default', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: {
        preset: 'next',
      },
    });
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
  describe('named input links', () => {
    it('should return correct target link for input if it is a namedInput in nx.json', async () => {
      modifyJsonFile(projectJsonPath, (data) => ({
        ...data,
        targets: {
          build: {
            inputs: ['default'],
          },
        },
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

      const targetLink = (linkResponse.result as any[])[0].target;
      // line 4 is where the `default` namedInput is defined in nx.json
      expect(targetLink).toMatch(new RegExp(`#4$`));
      expect(decodeURI(targetLink)).toContain(join(workspaceName, 'nx.json'));
    });

    it('should not return target link for input if it is not a namedInput in nx.json', async () => {
      modifyJsonFile(projectJsonPath, (data) => ({
        ...data,
        targets: {
          build: {
            inputs: ['src/file.js', 'other'],
          },
        },
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

      const targetLinks = linkResponse.result as any[];
      expect(targetLinks.length).toBe(0);
    });

    it('should return correct target link for named input within nx.json', async () => {
      const nxJsonPath = join(e2eCwd, workspaceName, 'nx.json');
      modifyJsonFile(nxJsonPath, (data) => ({
        ...data,
        namedInputs: {
          default: ['one', 'two'],
          one: ['src/file.js'],
        },
      }));

      nxlsWrapper.sendNotification({
        method: 'textDocument/didOpen',
        params: {
          textDocument: {
            uri: URI.file(nxJsonPath).toString(),
            languageId: 'JSON',
            version: 0,
            text: readFileSync(nxJsonPath, 'utf-8'),
          },
        },
      });

      const linkResponse = await nxlsWrapper.sendRequest({
        method: 'textDocument/documentLink',
        params: {
          textDocument: {
            uri: URI.file(nxJsonPath).toString(),
          },
          position: Position.create(0, 1),
        },
      });

      const targetLink = (linkResponse.result as any[])[0].target;
      // line 8 is where the `one` namedInput is defined in nx.json with default formatting
      expect(targetLink).toMatch(new RegExp(`#8$`));
      expect(decodeURI(targetLink)).toContain(join(workspaceName, 'nx.json'));
    });
  });
});
