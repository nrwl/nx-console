import { dirname, join } from 'path';

/**
 * Builds the project path from the given project name.
 * @param workspaceJsonPath The full path to the workspace.json file
 * @param projectPath The path to the project relative to the workspace.json file
 * @returns The full path to the project.json file
 */
export function buildProjectPath(
  workspaceJsonPath: string,
  projectPath: string
): string {
  const workspaceRootDir = dirname(workspaceJsonPath);
  return join(workspaceRootDir, projectPath, 'project.json');
}
