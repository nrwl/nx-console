const fs = require('fs-extra');
const { normalize } = require('path');

// copy dependency outputs
const nxlsDest = './dist/apps/vscode/nxls';
if (fs.existsSync(nxlsDest)) {
  fs.rmdirSync(nxlsDest, { recursive: true });
}
fs.copySync('./dist/apps/nxls', nxlsDest);

fs.copySync('./dist/apps/generate-ui-v2', './dist/apps/vscode/generate-ui-v2');
fs.copySync(
  './dist/libs/vscode/nx-cloud-onboarding-webview',
  './dist/apps/vscode/nx-cloud-onboarding-webview',
);

// copy package.json
fs.copySync('./apps/vscode/package.json', './dist/apps/vscode/package.json');

// copy required dependencies
//  we don't need the entire @vscode-elements/elements package, just the bundled.js file
const destFolder = normalize(
  './dist/apps/vscode/node_modules/@vscode-elements/elements/dist',
);
if (!fs.existsSync(destFolder)) {
  fs.mkdirSync(destFolder, { recursive: true });
}
fs.copyFileSync(
  normalize('./node_modules/@vscode-elements/elements/dist/bundled.js'),
  normalize(`${destFolder}/bundled.js`),
);

// copy the typescript plugin which is required at runtime
const typescriptPluginDestFolder = normalize(
  './dist/apps/vscode/node_modules/@nx-console/vscode-typescript-import-plugin',
);
if (!fs.existsSync(typescriptPluginDestFolder)) {
  fs.mkdirSync(typescriptPluginDestFolder, { recursive: true });
}
fs.cpSync(
  normalize('./libs/vscode/typescript-import-plugin/dist'),
  normalize(`${typescriptPluginDestFolder}/dist`),
  { recursive: true },
);
fs.cpSync(
  normalize('./libs/vscode/typescript-import-plugin/package.json'),
  normalize(`${typescriptPluginDestFolder}/package.json`),
);
