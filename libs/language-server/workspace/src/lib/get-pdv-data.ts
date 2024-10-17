import { directoryExists } from '@nx-console/shared/file-system';
import { readNxJson, workspaceDependencyPath } from '@nx-console/shared/npm';
import { PDVData } from '@nx-console/shared/types';
import type {
  ProjectConfiguration,
  ProjectGraphProjectNode,
} from 'nx/src/devkit-exports';
import { join, relative } from 'path';
import { gte } from 'semver';
import { getNxCloudStatus } from './get-nx-cloud-status';
import { getNxVersion } from './get-nx-version';
import { getProjectByPath } from './get-project-by-path';
import { getSourceMapFilesToProjectsMap } from './get-source-map';
import { nxWorkspace } from './workspace';

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
      pdvDataSerializedMulti: undefined,
      errorsSerialized: undefined,
      errorMessage: undefined,
    };
  }

  const nxVersion = await getNxVersion(workspacePath);

  if (!gte(nxVersion.full, '19.8.0')) {
    return {
      resultType: 'OLD_NX_VERSION',
      graphBasePath,
      pdvDataSerialized: undefined,
      pdvDataSerializedMulti: undefined,
      errorsSerialized: undefined,
      errorMessage: undefined,
    };
  }
  const workspace = await nxWorkspace(workspacePath);

  const hasProjects = Object.keys(workspace.workspace.projects).length > 0;

  if (!hasProjects || (workspace.errors && workspace.isPartial != true)) {
    let errorMessage = '';
    if (!hasProjects) {
      errorMessage = 'No projects found in the workspace.';
    }
    return {
      resultType: 'ERROR',
      graphBasePath,
      pdvDataSerialized: undefined,
      pdvDataSerializedMulti: undefined,
      errorsSerialized: JSON.stringify(workspace.errors),
      errorMessage,
    };
  }

  const relativePath = relative(workspacePath, filePath);

  const sourceMapsFilesToProjectsMap = await getSourceMapFilesToProjectsMap(
    workspacePath
  );
  const projectRootsForConfigFile = sourceMapsFilesToProjectsMap[relativePath];

  const nxCloudStatus = await getNxCloudStatus(workspacePath);
  const disabledTaskSyncGenerators = await getDisabledTaskSyncGenerators(
    workspacePath
  );

  if (!projectRootsForConfigFile || projectRootsForConfigFile.length <= 1) {
    const project = await getProjectByPath(filePath, workspacePath);

    if (!isCompleteProjectConfiguration(project)) {
      return {
        resultType: 'ERROR',
        graphBasePath,
        pdvDataSerialized: undefined,
        pdvDataSerializedMulti: undefined,
        errorsSerialized: JSON.stringify(workspace.errors),
        errorMessage: `No project found at ${filePath}`,
      };
    }

    const projectNode: ProjectGraphProjectNode =
      projectGraphNodeFromProject(project);
    return {
      resultType: 'SUCCESS',
      graphBasePath,
      pdvDataSerialized: JSON.stringify({
        project: projectNode,
        sourceMap: workspace.workspace.sourceMaps?.[project.root],
        errors: workspace.errors,
        connectedToCloud: nxCloudStatus.isConnected,
        disabledTaskSyncGenerators,
      }),
      pdvDataSerializedMulti: undefined,
      errorsSerialized: undefined,
      errorMessage: undefined,
    };
  } else {
    const projectNodes: ProjectGraphProjectNode[] = [];
    for (const project of Object.values(workspace.workspace.projects)) {
      if (
        projectRootsForConfigFile.includes(project.root) &&
        isCompleteProjectConfiguration(project)
      ) {
        projectNodes.push(projectGraphNodeFromProject(project));
      }
    }

    const pdvDataSerializedMulti: Record<string, string> = {};
    for (const project of projectNodes) {
      pdvDataSerializedMulti[project.name] = JSON.stringify({
        project,
        sourceMap: workspace.workspace.sourceMaps?.[project.data.root],
        errors: workspace.errors,
        connectedToCloud: nxCloudStatus.isConnected,
        disabledTaskSyncGenerators,
      });
    }

    return {
      resultType: 'SUCCESS_MULTI',
      graphBasePath,
      pdvDataSerializedMulti,
      pdvDataSerialized: undefined,
      errorsSerialized: undefined,
      errorMessage: undefined,
    };
  }
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

function projectGraphNodeFromProject(
  project: ProjectConfiguration & { name: string }
): ProjectGraphProjectNode {
  return {
    name: project.name,
    type:
      project.projectType === 'application'
        ? 'app'
        : project.projectType === 'library'
        ? 'lib'
        : 'e2e',
    data: project,
  };
}

function isCompleteProjectConfiguration(
  project: ProjectConfiguration | undefined
): project is ProjectConfiguration & { name: string } {
  return !!project && !!project.name;
}

async function getDisabledTaskSyncGenerators(
  workspacePath: string
): Promise<string[] | undefined> {
  try {
    const nxJson = await readNxJson(workspacePath);
    return nxJson.sync?.disabledTaskSyncGenerators;
  } catch (e) {
    return undefined;
  }
}
