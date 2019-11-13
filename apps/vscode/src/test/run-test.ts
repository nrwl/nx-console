import * as path from 'path';

import { runTests } from 'vscode-test';

main().catch(() => {
  console.error('Failed to run tests');
  process.exit(1);
});

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  const extensionTestsPath = path.resolve(__dirname, 'suite/index');

  // Download VS Code, unzip it and run the integration test
  await runTests({ extensionDevelopmentPath, extensionTestsPath });
}
