import { lspLogger } from '@nx-console/language-server/utils';
import {
  findNxPackagePath,
  importWorkspaceDependency,
} from '@nx-console/shared/npm';
import { join, relative, normalize } from 'path';

export async function getProjectGraphOutput(workspacePath: string) {
  const cacheDir = await getCacheDir(workspacePath);

  const directory = join(cacheDir, 'nx-console-project-graph');
  const fullPath = `${directory}/project-graph.html`;
  return {
    directory,
    relativePath: `./${normalize(relative(workspacePath, fullPath))}`,
    fullPath,
  };
}

async function getCacheDir(workspacePath: string): Promise<string> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'utils', 'cache-directory.js')
  );

  if (!importPath) {
    lspLogger.log(
      `Unable to load the "nx" package from the workspace. Please ensure that the proper dependencies are installed locally.`
    );
    throw 'local Nx dependency not found';
  }

  return (
    await importWorkspaceDependency<
      typeof import('nx/src/utils/cache-directory')
    >(importPath, lspLogger)
  ).cacheDir;
}
