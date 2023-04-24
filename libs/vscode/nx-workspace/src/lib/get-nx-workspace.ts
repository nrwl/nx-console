import { ProjectConfiguration } from 'nx/src/devkit-exports';
import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import { NxWorkspace } from '@nx-console/shared/types';
import { sendRequest } from '@nx-console/vscode/lsp-client';
import { parse } from 'dotenv';
import { join } from 'path';
import { readFileSync } from 'fs';

export function getNxWorkspace(reset?: boolean): Promise<NxWorkspace> {
  return sendRequest(NxWorkspaceRequest, { reset });
}

// shortcuts to reduce repeated destructuring all over the codebase
export async function getNxWorkspaceProjects(reset?: boolean): Promise<{
  [projectName: string]: ProjectConfiguration;
}> {
  const {
    workspace: { projects },
  } = await getNxWorkspace(reset);
  return projects;
}

export async function getNxWorkspacePath(): Promise<string> {
  const { workspacePath } = await getNxWorkspace();
  return workspacePath;
}

export async function getNxCloudRunnerOptions(): Promise<
  { accessToken: string; url?: string } | undefined
> {
  const nxWorkspace = await getNxWorkspace();
  const workspaceConfig = nxWorkspace.workspace;

  if (!workspaceConfig.tasksRunnerOptions) {
    return;
  }
  const nxCloudTaskRunner = Object.values(
    workspaceConfig.tasksRunnerOptions
  ).find((r) => r.runner == '@nrwl/nx-cloud' || r.runner == 'nx-cloud');

  if (!nxCloudTaskRunner) {
    return undefined;
  }

  // check if nx-cloud.env exists and use that access token if it does
  const env = getNxCloudEnv(nxWorkspace.workspacePath);
  const accessToken = env.NX_CLOUD_AUTH_TOKEN || env.NX_CLOUD_ACCESS_TOKEN;

  if (!accessToken) {
    return nxCloudTaskRunner.options;
  }

  return { ...nxCloudTaskRunner.options, accessToken };
}

function getNxCloudEnv(workspacePath: string): any {
  try {
    const envContents = readFileSync(join(workspacePath, 'nx-cloud.env'));
    return parse(envContents);
  } catch (e) {
    return {};
  }
}
