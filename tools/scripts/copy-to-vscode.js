const fs = require('fs-extra');

// copy dependency outputs
const nxlsDest = './dist/apps/vscode/nxls';
if (fs.existsSync(nxlsDest)) {
  fs.rmdirSync(nxlsDest, { recursive: true });
}
fs.copySync('./dist/apps/nxls', nxlsDest);

fs.copySync('./dist/apps/generate-ui-v2', './dist/apps/vscode/generate-ui-v2');
fs.copySync(
  './dist/libs/vscode/nx-cloud-onboarding-webview',
  './dist/apps/vscode/nx-cloud-onboarding-webview'
);

// copy package.json
fs.copySync('./apps/vscode/package.json', './dist/apps/vscode/package.json');
