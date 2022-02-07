import { join } from 'path';
import { Uri, workspace } from 'vscode';
import type { PnpApi } from '@yarnpkg/pnp';
declare function __non_webpack_require__(importPath: string): any;

let PNP_API: PnpApi;

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

  if (!PNP_API) {
    const pnp = __non_webpack_require__(pnpFile);
    pnp.setup();
    PNP_API = pnp;
  }

  return PNP_API;
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

  if (!pnp) {
    return [];
  }

  pnp.resolveRequest;

  const dependencies = [];
  for (const locator of pnp.getDependencyTreeRoots()) {
    const pkg = pnp.getPackageInformation(locator);
    if (!pkg?.packageDependencies) {
      continue;
    }
    for (const [name, reference] of pkg?.packageDependencies) {
      // Unmet peer dependencies
      if (reference === null) continue;
      if (!Array.isArray(reference) && reference.startsWith('workspace:'))
        continue;

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

    if (!pnp) {
      return;
    }

    let path: string =
      pnp.resolveToUnqualified(dependencyName, workspacePath + '/') ?? '';
    if (path.includes('__virtual__')) {
      path = pnp.resolveVirtual?.(path) ?? '';
    }

    return path;
  } catch {
    return;
  }
}
