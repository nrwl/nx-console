import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Position } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  e2eCwd,
  modifyJsonFile,
  newWorkspace,
  uniq,
} from '@nx-console/shared-e2e-utils';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const projectJsonPath = join(
  e2eCwd,
  workspaceName,
  'apps',
  workspaceName,
  'project.json',
);

describe('namedInput link completion - default', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: {
        preset: 'next',
      },
    });
    writeFileSync(projectJsonPath, `{}`);
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

      const defaultLine =
        readFileSync(join(e2eCwd, workspaceName, 'nx.json'), 'utf-8')
          .split('\n')
          .findIndex((line) => line.includes('"default":')) + 1;

      const targetLink = (linkResponse.result as any[])[0].target;
      expect(targetLink).toMatch(new RegExp(`#${defaultLine}$`));
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

      const oneLine =
        readFileSync(nxJsonPath, 'utf-8')
          .split('\n')
          .findIndex((line) => line.includes('"one": [')) + 1;

      const targetLink = (linkResponse.result as any[])[0].target;
      expect(targetLink).toMatch(new RegExp(`#${oneLine}$`));
      expect(decodeURI(targetLink)).toContain(join(workspaceName, 'nx.json'));
    });
  });
});
