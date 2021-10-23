import { verifyWorkspace } from './verify-workspace';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import * as server from '@nx-console/server';
import {
  cacheJson,
  fileExistsSync,
  getOutputChannel,
  getTelemetry,
} from '@nx-console/server';
import type { WorkspaceJsonConfiguration } from '@nrwl/devkit';
import * as vscode from 'vscode';

const mockCacheJsonFn = cacheJson as jest.MockedFunction<typeof cacheJson>;
mockCacheJsonFn.mockImplementation((filePath) => ({
  json: mockWorkspace,
  path: filePath,
}));

const mockStoreInstanceGetFn = WorkspaceConfigurationStore.instance
  .get as jest.MockedFunction<typeof WorkspaceConfigurationStore.instance.get>;
mockStoreInstanceGetFn.mockImplementation(() => workspacePath);

const mockFileExistsSyncFn = fileExistsSync as jest.MockedFunction<
  typeof fileExistsSync
>;

const originalNxConsoleServerModule = jest.requireActual('@nx-console/server');
(server.toWorkspaceFormat as unknown) =
  originalNxConsoleServerModule.toWorkspaceFormat;

const mockWorkspace: WorkspaceJsonConfiguration = {
  version: 2,
  projects: {
    Project3: {
      root: 'project-three',
    },
    Project1: {
      root: 'project-one',
    },
    Project2: {
      root: 'project-two',
    },
  },
};

const DefaultWorkspaceInformation = {
  validWorkspaceJson: false,
  workspaceType: 'nx',
  json: {
    projects: {},
    version: 2,
  },
  configurationFilePath: '',
};

const workspacePath = './test/fixtures/workspace/';

describe(verifyWorkspace.name, () => {
  afterEach(() => {
    mockFileExistsSyncFn.mockClear();
  });

  describe('when Nx workspace exists', () => {
    it('returns information about Nx workspace', async () => {
      // arrange
      mockFileExistsSyncFn.mockImplementation((filePath) =>
        /workspace.json$/i.test(filePath)
      );

      // act
      const { validWorkspaceJson, json, workspaceType, configurationFilePath } =
        await verifyWorkspace();

      // assert
      expect(mockFileExistsSyncFn).toHaveBeenCalledTimes(1);
      expect(mockFileExistsSyncFn).toHaveLastReturnedWith(true);
      expect(mockStoreInstanceGetFn).toHaveBeenCalledWith(
        'nxWorkspaceJsonPath',
        ''
      );
      expect(mockCacheJsonFn).toHaveBeenCalled();
      expect(validWorkspaceJson).toBe(true);
      expect(json).toBeTruthy();
      expect(json).toEqual(mockWorkspace);
      expect(workspaceType).toBe('nx');
      expect(configurationFilePath).toMatch(/workspace.json$/i);
    });
  });

  describe('when Ng workspace exists', () => {
    it('returns information about Ng workspace', async () => {
      // arrange
      mockFileExistsSyncFn.mockImplementation((filePath) =>
        /angular.json$/i.test(filePath)
      );

      // act
      const { validWorkspaceJson, json, workspaceType, configurationFilePath } =
        await verifyWorkspace();

      // assert
      expect(mockFileExistsSyncFn).toHaveBeenCalledTimes(2);
      expect(mockFileExistsSyncFn).toHaveNthReturnedWith(1, false);
      expect(mockFileExistsSyncFn).toHaveNthReturnedWith(2, true);
      expect(mockStoreInstanceGetFn).toHaveBeenCalledWith(
        'nxWorkspaceJsonPath',
        ''
      );
      expect(mockCacheJsonFn).toHaveBeenCalled();
      expect(validWorkspaceJson).toBe(true);
      expect(json).toBeTruthy();
      expect(json).toEqual(mockWorkspace);
      expect(workspaceType).toBe('ng');
      expect(configurationFilePath).toMatch(/angular.json$/i);
    });
  });

  describe('when workspace json does not exist', () => {
    it('it shows error dialog and returns default workspace information', async () => {
      // arrange
      mockFileExistsSyncFn.mockImplementation(
        (filePath) => !/(angular|workspace).json$/i.test(filePath)
      );

      (vscode.window.showErrorMessage as unknown) = jest
        .fn()
        .mockResolvedValue('Show Error');

      // act
      const result = await verifyWorkspace();

      // assert
      expect(mockFileExistsSyncFn).toHaveBeenCalledTimes(2);
      expect(mockFileExistsSyncFn).toHaveNthReturnedWith(1, false);
      expect(mockFileExistsSyncFn).toHaveNthReturnedWith(2, false);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Show Error'
      );
      expect(getOutputChannel).toHaveBeenCalledTimes(3);
      expect(getTelemetry).toHaveBeenCalledTimes(1);
      expect(result).toEqual(DefaultWorkspaceInformation);
    });
  });

  describe('when workspace information is found', () => {
    it('projects entries are sorted by entry key', async () => {
      // arrange
      mockFileExistsSyncFn.mockImplementationOnce(() => true);
      const sortedProject = {
        Project1: {
          root: 'project-one',
        },
        Project2: {
          root: 'project-two',
        },
        Project3: {
          root: 'project-three',
        },
      };

      // act
      const {
        json: { projects },
      } = await verifyWorkspace();
      const [project1, project2, project3] = Object.keys(projects);
      const [sorted1, sorted2, sorted3] = Object.keys(sortedProject);

      // assert
      expect(project1).toBe(sorted1); // should be 'Project1'
      expect(project2).toBe(sorted2); // should be 'Project2'
      expect(project3).toBe(sorted3); // should be 'Project3'
    });
  });
});
