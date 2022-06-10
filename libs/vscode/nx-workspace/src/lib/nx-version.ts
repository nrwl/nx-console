import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { findNxPackagePath } from './get-nx-workspace-package';

declare function __non_webpack_require__(importPath: string): any;

let nxWorkspacePackageJson: { version: string };
let loadedNxPackage = false;
export async function nxVersion(): Promise<number> {
  if (!loadedNxPackage) {
    const workspacePath = WorkspaceConfigurationStore.instance.get(
      'nxWorkspacePath',
      ''
    );

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
