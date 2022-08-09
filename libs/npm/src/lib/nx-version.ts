import { findNxPackagePath } from './find-nx-package-path';

declare function __non_webpack_require__(importPath: string): any;

let nxWorkspacePackageJson: { version: string };
let loadedNxPackage = false;
export async function nxVersion(workspacePath: string): Promise<number> {
  if (!loadedNxPackage) {
    const packagePath = await findNxPackagePath(workspacePath, 'package.json');

    if (!packagePath) {
      return 0;
    }

    nxWorkspacePackageJson = __non_webpack_require__(packagePath);
    loadedNxPackage = true;
  }

  if (!nxWorkspacePackageJson) {
    return 0;
  }
  const nxPackageVersion = nxWorkspacePackageJson.version;
  const majorVersion = nxPackageVersion.split('.')[0];
  if (!majorVersion) {
    return 0;
  }
  return +majorVersion;
}
