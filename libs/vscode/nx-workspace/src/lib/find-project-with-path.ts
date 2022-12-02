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
  let perfectMatchEntry: [string, ProjectConfiguration] | undefined;
  let secondaryMatchEntry: [string, ProjectConfiguration] | undefined;
  projectEntries.forEach((entry) => {
    const [, def] = entry;
    const fullProjectPath = join(
      workspacePath,
      // If root is empty, that means we're in an angular project with the old ng workspace setup. Otherwise use the sourceRoot
      def.root || def.sourceRoot || ''
    );
    if (fullProjectPath === selectedPath) {
      perfectMatchEntry = entry;
    }

    const relativePath = relative(fullProjectPath, selectedPath);
    if (
      relativePath &&
      !relativePath.startsWith('..') &&
      !isAbsolute(relativePath)
    ) {
      secondaryMatchEntry = entry;
    }
  });

  const entry = perfectMatchEntry ?? secondaryMatchEntry;

  return entry ? { name: entry[0], ...entry[1] } : null;
}
