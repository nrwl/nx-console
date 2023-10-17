import type {
  ProjectConfiguration,
  TargetConfiguration,
} from 'nx/src/devkit-exports';
import { NxWorkspaceRequest } from '@nx-console/language-server/types';
import {
  NxWorkspace,
  NxWorkspaceConfiguration,
} from '@nx-console/shared/types';
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

export async function getNxCloudRunnerOptions(
  reset?: boolean
): Promise<{ accessToken: string; url?: string } | undefined> {
  const nxWorkspace = await getNxWorkspace(reset);
  // TODO: remove type cast after update
  const workspaceConfig = nxWorkspace.workspace as NxWorkspaceConfiguration & {
    nxCloudAccessToken?: string;
    nxCloudUrl?: string;
  };

  // check if nx-cloud.env exists and use that access token if it does
  const env = getNxCloudEnv(nxWorkspace.workspacePath);
  const envAccessToken = env.NX_CLOUD_AUTH_TOKEN || env.NX_CLOUD_ACCESS_TOKEN;

  if (workspaceConfig.nxCloudAccessToken) {
    return {
      accessToken: envAccessToken || workspaceConfig.nxCloudAccessToken,
      url: workspaceConfig.nxCloudUrl,
    };
  }

  if (!workspaceConfig.tasksRunnerOptions) {
    return;
  }
  const nxCloudTaskRunner = Object.values(
    workspaceConfig.tasksRunnerOptions
  ).find((r) => r.runner == '@nrwl/nx-cloud' || r.runner == 'nx-cloud');

  if (!nxCloudTaskRunner) {
    return undefined;
  }

  return {
    accessToken: envAccessToken || nxCloudTaskRunner.options.accessToken,
    url: nxCloudTaskRunner.options.url,
  };
}

function getNxCloudEnv(workspacePath: string): any {
  try {
    const envContents = readFileSync(join(workspacePath, 'nx-cloud.env'));
    return parse(envContents);
  } catch (e) {
    return {};
  }
}

export async function getCacheableOperations(): Promise<string[]> {
  const { workspace } = await getNxWorkspace();
  const cacheableOperations = new Set<string>();
  for (const key in workspace.projects) {
    if (!workspace.projects.hasOwnProperty(key)) {
      continue;
    }
    const targets = workspace.projects[key].targets;
    for (const targetKey in targets) {
      if (!targets?.hasOwnProperty(targetKey)) {
        continue;
      }
      // TODO: remove type cast after update
      const target = targets?.[targetKey] as TargetConfiguration & {
        cache?: boolean;
      };

      if (target?.cache) {
        cacheableOperations.add(targetKey);
      }
    }
  }
  return [...cacheableOperations];
}
