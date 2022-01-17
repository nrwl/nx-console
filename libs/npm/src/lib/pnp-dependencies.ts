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

      try {
        let path: string = pnp.resolveToUnqualified(name, workspacePath + '/');
        if (path.includes('__virtual__')) {
          path = pnp.resolveVirtual(path);
        }

        dependencies.push(path);
      } catch {
        continue;
      }
    }
  }
  return dependencies;
}
