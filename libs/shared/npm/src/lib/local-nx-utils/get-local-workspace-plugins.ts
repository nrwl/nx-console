import { importNxPackagePath } from '../workspace-dependencies';
import { NxWorkspace } from '@nx-console/shared-types';
import type { ProjectsConfigurations } from 'nx/src/devkit-exports';
import type { PluginCapabilities } from 'nx/src/utils/plugins/plugin-capabilities';

export async function getLocalWorkspacePlugins(
  workspacePath: string,
  workspace: NxWorkspace,
): Promise<Map<string, PluginCapabilities>> {
  const { getLocalWorkspacePlugins } = await importNxPackagePath<
    typeof import('nx/src/utils/plugins/local-plugins')
  >(workspacePath, 'src/utils/plugins/local-plugins');

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

  return await getLocalWorkspacePlugins(
    projectsConfiguration,
    workspace.nxJson,
  );
}
