import { directoryExists } from '@nx-console/shared-file-system';
import { workspaceDependencyPath } from '@nx-console/shared-npm';
import { gte } from '@nx-console/nx-version';
import { GraphDataResult, NxError } from '@nx-console/shared-types';
import { join } from 'path';
import {
  getNxVersion,
  nxWorkspace,
} from '@nx-console/shared-nx-workspace-info';
import { lspLogger } from '@nx-console/language-server-utils';

export async function getGraphData(
  workspacePath: string,
): Promise<GraphDataResult> {
  const graphBasePath = await getGraphBasePath(workspacePath);

  if (!graphBasePath) {
    return {
      resultType: 'NO_GRAPH_ERROR',
      graphBasePath: undefined,
      graphDataSerialized: undefined,
      errorsSerialized: undefined,
      errorMessage: undefined,
      isPartial: undefined,
    };
  }

  const nxVersion = await getNxVersion(workspacePath);
  if (!gte(nxVersion, '19.8.0')) {
    return {
      resultType: 'OLD_NX_VERSION',
      graphBasePath,
      graphDataSerialized: undefined,
      errorsSerialized: undefined,
      errorMessage: undefined,
      isPartial: undefined,
    };
  }

  const workspace = await nxWorkspace(workspacePath, lspLogger);
  const hasProjects = Object.keys(workspace.projectGraph.nodes).length > 0;

  if (!hasProjects || (workspace.errors && workspace.isPartial != true)) {
    let errorMessage = '';
    if (!hasProjects) {
      errorMessage = 'No projects found in the workspace.';
    }
    return {
      resultType: 'ERROR',
      graphBasePath,
      graphDataSerialized: undefined,
      errorsSerialized: JSON.stringify(workspace.errors),
      errorMessage,
      isPartial: workspace.isPartial,
    };
  }

  return {
    resultType: 'SUCCESS',
    graphBasePath,
    graphDataSerialized: JSON.stringify(workspace.projectGraph),
    errorsSerialized: JSON.stringify(workspace.errors as NxError[] | undefined),
    errorMessage: undefined,
    isPartial: workspace.isPartial,
  };
}

async function getGraphBasePath(
  workspacePath: string,
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
