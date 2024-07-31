const fs = require('fs-extra');

fs.copySync('./dist/apps/nxls', './dist/apps/vscode/nxls');
fs.copySync('./dist/apps/generate-ui-v2', './dist/apps/vscode/generate-ui-v2');
fs.copySync(
  './dist/libs/vscode/nx-cloud-onboarding-webview',
  './dist/apps/vscode/nx-cloud-onboarding-webview'
);
