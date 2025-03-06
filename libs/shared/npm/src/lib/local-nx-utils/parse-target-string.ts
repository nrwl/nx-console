import type { ProjectGraph, Target } from 'nx/src/devkit-exports';
import { join } from 'path';
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
  const importPath = join(devkitPath, 'src/executors/parse-target-string');
  const { parseTargetString } =
    await importWorkspaceDependency<
      typeof import('@nx/devkit/src/executors/parse-target-string')
    >(importPath);
  return parseTargetString(targetString, projectGraph);
}
