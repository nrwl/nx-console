import { join } from 'path';

/**
 * Builds the project path from the given project name.
 * @param workspacePath The full path to the configured workspace
 * @param projectPath The path to the project relative to the workspace
 * @returns The full path to the project.json file
 */
export function buildProjectPath(
  workspacePath: string,
  projectPath: string
): string {
  return join(workspacePath, projectPath, 'project.json');
}
