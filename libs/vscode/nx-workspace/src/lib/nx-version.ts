import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';

declare function __non_webpack_require__(importPath: string): any;

let nxWorkspacePackageJson: { version: string };
let loadedNxPackage = false;
export function nxVersion(): number {
  if (!loadedNxPackage) {
    const workspacePath = WorkspaceConfigurationStore.instance.get(
      'nxWorkspacePath',
      ''
    );
    try {
      nxWorkspacePackageJson = __non_webpack_require__(
        `${workspacePath}/node_modules/@nrwl/workspace/package.json`
      );
      loadedNxPackage = true;
    } catch (e) {
      try {
        nxWorkspacePackageJson = __non_webpack_require__(
          `${workspacePath}/node_modules/nx/package.json`
        );
        loadedNxPackage = true;
      } catch {
        return 0;
      }
    }
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
