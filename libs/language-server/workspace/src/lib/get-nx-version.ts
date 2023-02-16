import { findNxPackagePath } from '@nx-console/shared/npm';
import { coerce, SemVer } from 'semver';

declare function __non_webpack_require__(importPath: string): any;

let nxWorkspacePackageJson: { version: string };
let loadedNxPackage = false;

const defaultSemver = new SemVer('0.0.0');

export async function getNxVersion(workspacePath: string): Promise<SemVer> {
  if (!loadedNxPackage) {
    const packagePath = await findNxPackagePath(workspacePath, 'package.json');

    if (!packagePath) {
      return defaultSemver;
    }

    nxWorkspacePackageJson = __non_webpack_require__(packagePath);
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
