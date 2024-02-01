import { findNxPackagePath } from '@nx-console/shared/npm';
import { coerce, SemVer } from 'semver';

let nxWorkspacePackageJson: { version: string } | undefined;
let loadedNxPackage = false;

const defaultSemver = new SemVer('0.0.0');

export async function getNxVersion(workspacePath: string): Promise<SemVer> {
  if (!loadedNxPackage) {
    const packagePath = await findNxPackagePath(workspacePath, 'package.json');

    if (!packagePath) {
      return defaultSemver;
    }

    nxWorkspacePackageJson = require(packagePath);
    loadedNxPackage = true;
  }

  if (!nxWorkspacePackageJson) {
    return defaultSemver;
  }
  const nxVersion = coerce(nxWorkspacePackageJson.version);
  if (!nxVersion) {
    return defaultSemver;
  }

  return nxVersion;
}

export async function resetNxVersionCache() {
  loadedNxPackage = false;
  nxWorkspacePackageJson = undefined;
}
