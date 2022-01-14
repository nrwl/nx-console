import { join } from 'path';
import { Uri, workspace } from 'vscode';
import { PosixFS, ZipOpenFS } from '@yarnpkg/fslib';
import { getLibzipSync as libzip } from '@yarnpkg/libzip';

declare function __non_webpack_require__(importPath: string): any;

const PNP_FILE_NAME = '.pnp.cjs';
export async function isWorkspaceInPnp(workspacePath: string) {
  try {
    const pnpFile = join(workspacePath, PNP_FILE_NAME);
    await workspace.fs.stat(Uri.file(pnpFile));
    return true;
  } catch {
    return false;
  }
}

export function pnpApi(workspacePath: string) {
  const pnpFile = join(workspacePath, PNP_FILE_NAME);

  return __non_webpack_require__(pnpFile);
}

export async function pnpWorkspaceDependencies(workspacePath: string) {
  const pnp = pnpApi(workspacePath);

  const dependencies = [];
  for (const locator of pnp.getDependencyTreeRoots()) {
    const pkg = pnp.getPackageInformation(locator);
    for (const [name, reference] of pkg.packageDependencies) {
      // Unmet peer dependencies
      if (reference === null) continue;
      if (reference.startsWith('workspace:')) continue;

      const depPkg = pnp.getPackageInformation({ name, reference });

      try {
        let path: string = pnp.resolveToUnqualified(name, workspacePath + '/');
        if (path.includes('__virtual__')) {
          path = pnp.resolveVirtual(path);
        }

        dependencies.push({
          name,
          path,
          packageJson: await crossFs.readJsonPromise(path + '/package.json'),
        });
      } catch {
        continue;
      }
    }
  }
  debugger;
  return dependencies;
}

const zipOpenFs = new ZipOpenFS({ libzip });
export const crossFs = new PosixFS(zipOpenFs);
