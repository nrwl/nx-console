import type { ProjectGraph, Target } from 'nx/src/devkit-exports';
import {
  importWorkspaceDependency,
  workspaceDependencyPath,
} from '../workspace-dependencies';

export async function parseTargetString(
  targetString: string,
  projectGraph: ProjectGraph,
  workspacePath: string,
): Promise<Target> {
  const devkitPath = await workspaceDependencyPath(workspacePath, '@nx/devkit');
  if (!devkitPath) {
    throw 'local @nx/devkit dependency not found';
  }
  const { parseTargetString } =
    await importWorkspaceDependency<
      Pick<typeof import('@nx/devkit'), 'parseTargetString'>
    >(devkitPath);
  return parseTargetString(targetString, projectGraph);
}
