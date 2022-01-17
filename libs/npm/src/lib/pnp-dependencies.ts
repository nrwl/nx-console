import { join } from 'path';
import { Uri, workspace } from 'vscode';

declare function __non_webpack_require__(importPath: string): any;

async function getPnpFile(workspacePath: string) {
  const extensions = ['.cjs', '.js'];
  for (const ext of extensions) {
    try {
      const fileName = `.pnp${ext}`;
      const pnpFile = join(workspacePath, fileName);
      await workspace.fs.stat(Uri.file(pnpFile));
      return pnpFile;
    } catch {
      return;
    }
  }
}

async function pnpApi(workspacePath: string) {
  const pnpFile = await getPnpFile(workspacePath);
  if (!pnpFile) {
    return;
  }

  return __non_webpack_require__(pnpFile);
}

export async function isWorkspaceInPnp(workspacePath: string) {
  try {
    const file = await getPnpFile(workspacePath);
    return !!file;
  } catch {
    return false;
  }
}

export async function pnpDependencies(workspacePath: string) {
  const pnp = await pnpApi(workspacePath);

  const dependencies = [];
  for (const locator of pnp.getDependencyTreeRoots()) {
    const pkg = pnp.getPackageInformation(locator);
    for (const [name, reference] of pkg.packageDependencies) {
      // Unmet peer dependencies
      if (reference === null) continue;
      if (reference.startsWith('workspace:')) continue;

      const path = await pnpDependencyPath(workspacePath, name);
      if (path) {
        dependencies.push(path);
      }
    }
  }
  return dependencies;
}

export async function pnpDependencyPath(
  workspacePath: string,
  dependencyName: string
) {
  try {
    const pnp = await pnpApi(workspacePath);
    let path: string = pnp.resolveToUnqualified(
      dependencyName,
      workspacePath + '/'
    );
    if (path.includes('__virtual__')) {
      path = pnp.resolveVirtual(path);
    }

    return path;
  } catch {
    return;
  }
}
