import { join } from 'path';
import {
  importWorkspaceDependency,
  workspaceDependencyPath,
} from '../workspace-dependencies';
import { NxWorkspace } from '@nx-console/shared-types';
import type { ProjectsConfigurations } from 'nx/src/devkit-exports';
import type { PluginCapabilities } from 'nx/src/utils/plugins/plugin-capabilities';

export async function getLocalWorkspacePlugins(
  workspacePath: string,
  workspace: NxWorkspace,
): Promise<Map<string, PluginCapabilities>> {
  const nxPath = await workspaceDependencyPath(workspacePath, 'nx');
  if (!nxPath) {
    throw 'local nx dependency not found';
  }
  const importPath = join(nxPath, 'src/utils/plugins/local-plugins');
  const { getLocalWorkspacePlugins } =
    await importWorkspaceDependency<
      typeof import('nx/src/utils/plugins/local-plugins')
    >(importPath);

  const projectsConfiguration: ProjectsConfigurations = {
    // placeholder, doesn't actually matter
    version: 1,
    projects: {},
  };
  for (const [projectName, project] of Object.entries(
    workspace.projectGraph.nodes,
  )) {
    projectsConfiguration.projects[projectName] = project.data;
  }

  return getLocalWorkspacePlugins(projectsConfiguration, workspace.nxJson);
}
