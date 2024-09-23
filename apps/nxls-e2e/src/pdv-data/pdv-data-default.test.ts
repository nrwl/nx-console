import { join } from 'path';
import { NxlsWrapper } from '../nxls-wrapper';
import {
  defaultVersion,
  e2eCwd,
  newWorkspace,
  simpleReactWorkspaceOptions,
  uniq,
  waitFor,
} from '../utils';
import {
  NxPDVDataRequest,
  NxWorkspaceRefreshNotification,
} from '@nx-console/language-server/types';
import { PDVData } from '@nx-console/shared/types';
import {
  appendFile,
  appendFileSync,
  readFileSync,
  rmdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'fs';

let nxlsWrapper: NxlsWrapper;
const workspaceName = uniq('workspace');

const viteFilePath = join(e2eCwd, workspaceName, 'vite.config.ts');
let viteFileContents: string;

const projectJsonPath = join(e2eCwd, workspaceName, 'project.json');
let projectJsonContents: string;

describe('pdv data', () => {
  beforeAll(async () => {
    newWorkspace({
      name: workspaceName,
      options: simpleReactWorkspaceOptions,
      version: defaultVersion,
    });

    nxlsWrapper = new NxlsWrapper();
    await nxlsWrapper.startNxls(join(e2eCwd, workspaceName));
    nxlsWrapper.setVerbose(false);
  });

  afterAll(async () => {
    await nxlsWrapper.stopNxls();
  });

  it('should contain success pdv data by default', async () => {
    const pdvData = (
      await nxlsWrapper.sendRequest({
        ...NxPDVDataRequest,
        params: {
          filePath: join(e2eCwd, workspaceName, 'project.json'),
        },
      })
    ).result as PDVData;

    expect(pdvData.graphBasePath).toBeDefined();
    expect(pdvData.resultType).toEqual('SUCCESS');
    expect(pdvData.pdvDataSerialized).toBeDefined();

    const pdvDataParsed = JSON.parse(pdvData.pdvDataSerialized ?? '');
    expect(pdvDataParsed.project.name).toEqual(workspaceName);
    expect(Object.keys(pdvDataParsed.sourceMap ?? {}).length).toBeGreaterThan(
      0
    );
  });

  it('should contain pdv data & error for partial errors', async () => {
    viteFileContents = readFileSync(viteFilePath, 'utf-8');

    appendFileSync(viteFilePath, '{');

    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    const pdvData = (
      await nxlsWrapper.sendRequest({
        ...NxPDVDataRequest,
        params: {
          filePath: join(e2eCwd, workspaceName, 'project.json'),
        },
      })
    ).result as PDVData;

    expect(pdvData.graphBasePath).toBeDefined();
    expect(pdvData.resultType).toEqual('SUCCESS');
    expect(pdvData.pdvDataSerialized).toBeDefined();

    const pdvDataParsed = JSON.parse(pdvData.pdvDataSerialized ?? '');
    expect(pdvDataParsed.project.name).toEqual(workspaceName);
    expect(Object.keys(pdvDataParsed.sourceMap ?? {}).length).toBeGreaterThan(
      0
    );
    expect(pdvDataParsed.errors.length).toBeGreaterThan(0);
  });

  it('should return error if root project.json is broken', async () => {
    writeFileSync(viteFilePath, viteFileContents);

    projectJsonContents = readFileSync(projectJsonPath, 'utf-8');
    writeFileSync(projectJsonPath, '{');

    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    const e2ePdvData = (
      await nxlsWrapper.sendRequest({
        ...NxPDVDataRequest,
        params: {
          filePath: projectJsonPath,
        },
      })
    ).result as PDVData;

    expect(e2ePdvData.resultType).toEqual('ERROR');
    expect(e2ePdvData.errorMessage).toBeDefined();
    expect(e2ePdvData.pdvDataSerialized).toBeUndefined();
    expect(e2ePdvData.errorsSerialized).toBeDefined();
    expect(
      JSON.parse(e2ePdvData.errorsSerialized ?? '').length
    ).toBeGreaterThan(0);
  });

  it('should return error if nx.json is broken', async () => {
    console.log('---- set verbose ---');
    await waitFor(1000);

    nxlsWrapper.setVerbose(true);

    console.log('reverting project.json');
    writeFileSync(projectJsonPath, projectJsonContents);

    const nxJsonPath = join(e2eCwd, workspaceName, 'nx.json');
    console.log('writing nx.json');

    writeFileSync(nxJsonPath, '{');

    console.log('waiting for refresh');
    await nxlsWrapper.waitForNotification(
      NxWorkspaceRefreshNotification.method
    );

    const e2ePdvData = (
      await nxlsWrapper.sendRequest({
        ...NxPDVDataRequest,
        params: {
          filePath: projectJsonPath,
        },
      })
    ).result as PDVData;

    expect(e2ePdvData.resultType).toEqual('ERROR');
    expect(e2ePdvData.errorMessage).toBeDefined();
    expect(e2ePdvData.pdvDataSerialized).toBeUndefined();

    expect(e2ePdvData.errorsSerialized).toBeDefined();
    expect(
      JSON.parse(e2ePdvData.errorsSerialized ?? '').length
    ).toBeGreaterThan(0);
  });

  it('should return graph error if graph file cant be found', async () => {
    console.log('---- unset verbose ---');

    nxlsWrapper.setVerbose(false);

    rmSync(join(e2eCwd, workspaceName, 'node_modules'), {
      recursive: true,
      force: true,
    });

    const e2ePdvData = (
      await nxlsWrapper.sendRequest({
        ...NxPDVDataRequest,
        params: {
          filePath: projectJsonPath,
        },
      })
    ).result as PDVData;

    expect(e2ePdvData.resultType).toEqual('NO_GRAPH_ERROR');
    expect(e2ePdvData.errorMessage).toBeUndefined();
    expect(e2ePdvData.pdvDataSerialized).toBeUndefined();

    expect(e2ePdvData.errorsSerialized).toBeUndefined();
  });
});
