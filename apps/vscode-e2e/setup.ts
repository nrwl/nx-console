import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import { execSync } from 'node:child_process';
import { workspaceRoot } from 'nx/src/devkit-exports';

export default async function globalSetup() {
  // Download VS Code stable for tests
  const vscodePath = await downloadAndUnzipVSCode('stable');
  process.env.VSCODE_E2E_BINARY_PATH = vscodePath;

  execSync('yarn nx run vscode:build', {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });
  execSync('yarn nx run vscode-e2e:build-runner', {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });
}
