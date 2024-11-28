import {
  importWorkspaceDependency,
  workspaceDependencyPath,
} from '@nx-console/shared/npm';
import { gte, NxVersion } from '@nx-console/shared/nx-version';
import type { ProjectGraph, Target } from 'nx/src/devkit-exports';
import { join } from 'path';

export async function parseTargetString(
  targetString: string,
  projectGraph: ProjectGraph,
  workspacePath: string,
  nxVersion?: NxVersion
): Promise<Target> {
  const devkitPath = await workspaceDependencyPath(workspacePath, '@nx/devkit');
  if (!devkitPath) {
    throw 'local @nx/devkit dependency not found';
  }
  const importPath = join(devkitPath, 'src/executors/parse-target-string');
  const { parseTargetString } = await importWorkspaceDependency<
    typeof import('@nx/devkit/src/executors/parse-target-string')
  >(importPath);
  let parsedTarget: Target;
  if (!nxVersion || gte(nxVersion, '17.0.6')) {
    parsedTarget = parseTargetString(targetString, projectGraph);
  } else {
    parsedTarget = (parseTargetString as any)(targetString);
  }

  return parsedTarget;
}
