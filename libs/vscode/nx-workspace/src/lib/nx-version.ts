import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';

declare function __non_webpack_require__(importPath: string): any;

let nxWorkspacePackageJson: { version: string };
let loadedNxWorkspacePackage = false;
export function nxVersion(): number {
  if (!loadedNxWorkspacePackage) {
    const workspacePath = WorkspaceConfigurationStore.instance.get(
      'nxWorkspacePath',
      ''
    );
    try {
      nxWorkspacePackageJson = __non_webpack_require__(
        `${workspacePath}/node_modules/@nrwl/workspace/package.json`
      );
      loadedNxWorkspacePackage = true;
    } catch (e) {
      // ignore
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
