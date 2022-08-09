import { nxWorkspace } from './nx-workspace';
import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import * as server from '@nx-console/utils';
import { getOutputChannel, getTelemetry } from '@nx-console/utils';
import { mocked } from 'jest-mock';
import type {
  NxJsonConfiguration,
  WorkspaceJsonConfiguration,
} from '@nrwl/devkit';
import * as vscode from 'vscode';
import type { AsyncReturnType } from 'type-fest';

import { getNxWorkspaceConfig } from './get-nx-workspace-config';

jest.mock('./get-nx-workspace-config', () => {
  const originalModule = jest.requireActual('./get-nx-workspace-config');
  return {
    ...originalModule,
    getNxWorkspaceConfig: async (): Promise<
      AsyncReturnType<typeof getNxWorkspaceConfig>
    > => {
      return {
        workspaceConfiguration: mockWorkspace,
        configPath: '',
      };
    },
  };
});
const getNxWorkspaceConfigMock = mocked(getNxWorkspaceConfig);

import * as fs from '@nx-console/file-system';
jest.mock('@nx-console/file-system', (): Partial<typeof fs> => {
  const original = jest.requireActual('@nx-console/file-system');
  return {
    ...original,
    fileExists: jest.fn(() => Promise.resolve(true)),
  };
});

const mockStoreInstanceGetFn = WorkspaceConfigurationStore.instance
  .get as jest.MockedFunction<typeof WorkspaceConfigurationStore.instance.get>;
mockStoreInstanceGetFn.mockImplementation(() => workspacePath);

const mockWorkspace: WorkspaceJsonConfiguration & NxJsonConfiguration = {
  version: 2,
  npmScope: '@test',
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

// Rewrite these tests. They're too fragile, and don't actually test the output of the function.
xdescribe('verifyWorkspace', () => {
  afterEach(() => {
    // noop
  });

  describe('when Nx workspace exists', () => {
    it('returns information about Nx workspace', async () => {
      // arrange

      // act
      const {
        validWorkspaceJson,
        workspace,
        workspaceType,
        configurationFilePath,
      } = await nxWorkspace();

      // assert
      expect(mockStoreInstanceGetFn).toHaveBeenCalledWith(
        'nxWorkspacePath',
        ''
      );

      expect(validWorkspaceJson).toBe(true);
      expect(workspace).toBeTruthy();
      expect(workspace).toEqual(mockWorkspace);
      expect(workspaceType).toBe('nx');
      expect(configurationFilePath).toMatch(/workspace.json$/i);
    });
  });

  describe('when Ng workspace exists', () => {
    it('returns information about Ng workspace', async () => {
      // arrange
      getNxWorkspaceConfigMock.mockImplementationOnce(async () => {
        return {
          workspaceConfiguration: mockWorkspace,
          configPath: 'angular.json',
        };
      });
      // act
      const {
        validWorkspaceJson,
        workspace,
        workspaceType,
        configurationFilePath,
      } = await nxWorkspace();

      // assert
      expect(mockStoreInstanceGetFn).toHaveBeenCalledWith(
        'nxWorkspacePath',
        ''
      );

      expect(validWorkspaceJson).toBe(true);
      expect(workspace).toBeTruthy();
      expect(workspace).toEqual(mockWorkspace);
      expect(workspaceType).toBe('ng');
      expect(configurationFilePath).toMatch(/angular.json$/i);
    });
  });

  describe('when workspace json does not exist', () => {
    it('it shows error dialog and returns default workspace information', async () => {
      // arrange

      (vscode.window.showErrorMessage as unknown) = jest
        .fn()
        .mockResolvedValue('Show Error');

      // act
      const result = await nxWorkspace();

      // assert

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
        workspace: { projects },
      } = await nxWorkspace();
      const [project1, project2, project3] = Object.keys(projects);
      const [sorted1, sorted2, sorted3] = Object.keys(sortedProject);

      // assert
      expect(project1).toBe(sorted1); // should be 'Project1'
      expect(project2).toBe(sorted2); // should be 'Project2'
      expect(project3).toBe(sorted3); // should be 'Project3'
    });
  });
});
