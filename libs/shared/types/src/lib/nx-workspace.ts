import { NxJsonConfiguration, ProjectConfiguration } from '@nrwl/devkit';

export type NxProjectConfiguration = ProjectConfiguration & {
  files?: { file: string }[];
};

export type NxProjectsConfiguration = {
  version: number;
  projects: {
    [projectName: string]: NxProjectConfiguration;
  };
};

export type NxWorkspaceConfiguration = NxProjectsConfiguration &
  NxJsonConfiguration;
export interface NxWorkspace {
  validWorkspaceJson: boolean;
  workspace: NxWorkspaceConfiguration;
  workspaceType: 'ng' | 'nx';
  daemonEnabled?: boolean;
  workspacePath: string;
  isLerna: boolean;
  isEncapsulatedNx: boolean;
  workspaceLayout: {
    appsDir?: string;
    libsDir?: string;
  };
}
