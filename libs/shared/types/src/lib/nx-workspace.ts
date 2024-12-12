import { NxVersion } from '@nx-console/nx-version';
import type {
  NxJsonConfiguration,
  ProjectConfiguration,
  ProjectFileMap,
  ProjectGraph,
} from 'nx/src/devkit-exports';
import type { ConfigurationSourceMaps } from 'nx/src/project-graph/utils/project-configuration-utils';

export type NxProjectConfiguration = ProjectConfiguration & {
  files?: { file: string }[];
};

export interface NxWorkspace {
  validWorkspaceJson: boolean;
  nxJson: NxJsonConfiguration;
  projectGraph: ProjectGraph;
  sourceMaps?: ConfigurationSourceMaps;
  projectFileMap?: ProjectFileMap;
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
  workspacePath: string;
}

export type NxError = {
  name?: string;
  message?: string;
  file?: string;
  plugin?: string;
  stack?: string;
  cause?: any;
};
