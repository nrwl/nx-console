import {
  findNxPackagePath,
  workspaceDependencyPath,
} from '@nx-console/shared/npm';
import { nxWorkspace } from './workspace';
import { getProjectByPath } from './get-project-by-path';
import { getNxVersion } from './get-nx-version';
import type { ProjectGraphProjectNode } from 'nx/src/devkit-exports';
import { PDVData } from '@nx-console/shared/types';
import { join } from 'path';
import { directoryExists } from '@nx-console/shared/file-system';

export async function getPDVData(
  workspacePath: string,
  filePath: string
): Promise<PDVData> {
  const graphBasePath = await getGraphBasePath(workspacePath);

  if (!graphBasePath) {
    return {
      resultType: 'NO_GRAPH_ERROR',
      graphBasePath: undefined,
      pdvDataSerialized: undefined,
      errorsSerialized: undefined,
      errorMessage: undefined,
    };
  }

  const nxVersion = await getNxVersion(workspacePath);
  const workspace = await nxWorkspace(workspacePath);
  const project = await getProjectByPath(filePath, workspacePath);

  const hasProjects = Object.keys(workspace.workspace.projects).length > 0;

  if (
    !hasProjects ||
    !project ||
    !project.name ||
    (workspace.errors && (nxVersion.major < 19 || workspace.isPartial != true))
  ) {
    let errorMessage = '';
    if (!hasProjects) {
      errorMessage = 'No projects found in the workspace.';
    } else if (!project) {
      errorMessage = `No project found at ${filePath}`;
    }
    return {
      resultType: 'ERROR',
      graphBasePath,
      pdvDataSerialized: undefined,
      errorsSerialized: JSON.stringify(workspace.errors),
      errorMessage,
    };
  }

  const projectNode: ProjectGraphProjectNode = {
    name: project.name,
    type:
      project.projectType === 'application'
        ? 'app'
        : project.projectType === 'library'
        ? 'lib'
        : 'e2e',
    data: project,
  };

  return {
    resultType: 'SUCCESS',
    graphBasePath,
    pdvDataSerialized: JSON.stringify({
      project: projectNode,
      sourceMap: workspace.workspace.sourceMaps?.[project.root],
      errors: workspace.errors,
    }),
    errorsSerialized: undefined,
    errorMessage: undefined,
  };
}

async function getGraphBasePath(
  workspacePath: string
): Promise<string | undefined> {
  const nxWorkspaceDepPath = await workspaceDependencyPath(workspacePath, 'nx');

  if (!nxWorkspaceDepPath) {
    return undefined;
  }

  const graphBasePath = join(nxWorkspaceDepPath, 'src', 'core', 'graph');

  if (await directoryExists(graphBasePath)) {
    return graphBasePath;
  } else {
    return undefined;
  }
}
