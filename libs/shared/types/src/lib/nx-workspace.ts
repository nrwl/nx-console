import { NxJsonConfiguration, ProjectsConfigurations } from '@nrwl/devkit';

export type NxWorkspaceConfiguration = ProjectsConfigurations &
  NxJsonConfiguration;

export interface NxWorkspace {
  validWorkspaceJson: boolean;
  workspace: NxWorkspaceConfiguration;
  workspaceType: 'ng' | 'nx';
  configurationFilePath: string;
  daemonEnabled?: boolean;
  workspacePath: string;
  isLerna: boolean;
  workspaceLayout: {
    appsDir: string;
    libsDir: string;
  };
}
