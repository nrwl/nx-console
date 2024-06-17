import type {
  NxJsonConfiguration,
  ProjectConfiguration,
} from 'nx/src/devkit-exports';
import type { ConfigurationSourceMaps } from 'nx/src/project-graph/utils/project-configuration-utils';

export type NxProjectConfiguration = ProjectConfiguration & {
  files?: { file: string }[];
};

export type NxProjectsConfiguration = {
  version: number;
  projects: {
    [projectName: string]: NxProjectConfiguration;
  };
  sourceMaps?: ConfigurationSourceMaps;
};

export type NxVersion = {
  major: number;
  minor: number;
  full: string;
};

export type NxWorkspaceConfiguration = NxProjectsConfiguration &
  NxJsonConfiguration;
export interface NxWorkspace {
  validWorkspaceJson: boolean;
  workspace: NxWorkspaceConfiguration;
  daemonEnabled?: boolean;
  workspacePath: string;
  isLerna: boolean;
  nxVersion: NxVersion;
  isEncapsulatedNx: boolean;
  errors?: NxError[];
  isPartial?: boolean;
  workspaceLayout: {
    appsDir?: string;
    libsDir?: string;
    projectNameAndRootFormat?: 'as-provided' | 'derived';
  };
}

export type NxError = {
  name?: string;
  message?: string;
  file?: string;
  plugin?: string;
  stack?: string;
  cause?: any;
};
