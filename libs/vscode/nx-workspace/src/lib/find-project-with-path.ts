import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { ProjectConfiguration } from '@nrwl/devkit';
import { isAbsolute, join, relative } from 'path';
import { nxWorkspace } from './nx-workspace';

export async function findProjectWithPath(
  selectedPath: string
): Promise<ProjectConfiguration | null> {
  const workspacePath = WorkspaceConfigurationStore.instance.get(
    'nxWorkspacePath',
    ''
  );
  const { workspace } = await nxWorkspace();
  const projectEntries = Object.entries(workspace.projects);
  const entry = projectEntries.find(([, def]) => {
    const fullProjectPath = join(
      workspacePath,
      // If root is empty, that means we're in an angular project with the old ng workspace setup. Otherwise use the sourceRoot
      def.root || def.sourceRoot || ''
    );
    if (fullProjectPath === selectedPath) {
      return true;
    }

    const relativePath = relative(fullProjectPath, selectedPath);
    return (
      relativePath &&
      !relativePath.startsWith('..') &&
      !isAbsolute(relativePath)
    );
  });

  return entry ? { name: entry[0], ...entry[1] } : null;
}
