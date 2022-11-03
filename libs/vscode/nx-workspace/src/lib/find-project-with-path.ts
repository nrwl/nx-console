import { ProjectConfiguration } from '@nrwl/devkit';
import { isAbsolute, join, relative } from 'path';
import { getNxWorkspace } from './get-nx-workspace';

export async function findProjectWithPath(
  selectedPath: string | undefined,
  workspacePath: string
): Promise<ProjectConfiguration | null> {
  if (!selectedPath) {
    return null;
  }

  const { workspace } = await getNxWorkspace();
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
