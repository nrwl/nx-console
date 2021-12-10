import { getNxWorkspacePackageFileUtils } from './get-nx-workspace-package';
import type {
  WorkspaceJsonConfiguration,
  NxJsonConfiguration,
} from '@nrwl/devkit';
import { join } from 'path';

export async function getNxWorkspaceConfig(
  basedir: string,
  format: 'nx' | 'angularCli'
): Promise<{
  workspaceConfiguration: WorkspaceJsonConfiguration & NxJsonConfiguration;
  configPath: string;
}> {
  const nxWorkspacePackage = await getNxWorkspacePackageFileUtils();

  const configFile = nxWorkspacePackage.workspaceFileName();

  return {
    workspaceConfiguration: nxWorkspacePackage.readWorkspaceConfig({
      format,
      path: basedir,
    }),
    configPath: join(basedir, configFile),
  };
}
