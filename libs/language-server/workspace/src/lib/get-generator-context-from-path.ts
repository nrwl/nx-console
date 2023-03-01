import {
  TaskExecutionSchema,
  isProjectOption,
} from '@nx-console/shared/schema';
import { getProjectByPath } from './get-project-by-path';
import { nxWorkspace } from './workspace';

export async function getGeneratorContextFromPath(
  generator: TaskExecutionSchema | undefined,
  path: string,
  workspacePath: string
): Promise<
  | {
      path?: string;
      directory?: string;
      project?: string;
      projectName?: string;
    }
  | undefined
> {
  if (!path) {
    return;
  }
  const project = await getProjectByPath(path, workspacePath);
  const projectName = (project && project.name) || undefined;

  let modifiedPath = path
    .replace(workspacePath, '')
    .replace(/\\/g, '/')
    .replace(/^\//, '');

  const { workspaceLayout } = await nxWorkspace(workspacePath);
  const appsDir = workspaceLayout.appsDir;
  const libsDir = workspaceLayout.libsDir;
  if (
    appsDir &&
    (generator?.name === 'application' ||
      generator?.name === 'app' ||
      modifiedPath.startsWith(appsDir))
  ) {
    modifiedPath = modifiedPath.replace(appsDir, '').replace(/^\//, '');
  }
  if (
    libsDir &&
    (generator?.name === 'library' ||
      generator?.name === 'lib' ||
      modifiedPath.startsWith(libsDir))
  ) {
    modifiedPath = modifiedPath.replace(libsDir, '').replace(/^\//, '');
  }

  return {
    project: projectName,
    projectName,
    path: modifiedPath,
    ...(!(projectName && generator?.options?.some(isProjectOption)) && {
      directory: modifiedPath,
    }),
  };
}
