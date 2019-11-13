import * as path from 'path';

import { runTests } from 'vscode-test';

main().catch(() => {
  console.error('Failed to run tests');
  process.exit(1);
});

async function main() {
  const workspaceRoot = path.resolve(__dirname, '../../../../../tmp/proj');
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  const extensionTestsPath = path.resolve(__dirname, 'suite/index');

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [workspaceRoot]
  });
}
