const { execSync } = require('child_process');
const fs = require('fs-extra');
const { normalize, join } = require('path');

// copy dependency outputs
const nxlsDest = './dist/apps/vscode/nxls';
if (fs.existsSync(nxlsDest)) {
  fs.rmSync(nxlsDest, { recursive: true });
}
fs.copySync('./dist/apps/nxls', nxlsDest);

fs.copySync('./dist/apps/generate-ui-v2', './dist/apps/vscode/generate-ui-v2');
fs.copySync(
  './dist/libs/vscode/nx-cloud-onboarding-webview',
  './dist/apps/vscode/nx-cloud-onboarding-webview',
);
fs.copySync(
  './dist/libs/vscode/migrate-sidebar-webview',
  './dist/apps/vscode/migrate-sidebar-webview',
);

// copy package.json
fs.copySync('./apps/vscode/package.json', './dist/apps/vscode/package.json');

execSync('npm install -f', {
  cwd: './dist/apps/vscode',
  stdio: 'inherit',
});

// copy required dependencies
// we don't need the entire @vscode-elements/elements package, just the bundled.js file
if (!fs.existsSync('node_modules')) {
  throw new Error(
    'Please make sure node_modules are installed by running yarn.',
  );
}
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

// copy codicons
const codiconsDestFolder = normalize(
  './dist/apps/vscode/node_modules/@vscode/codicons/dist',
);
if (!fs.existsSync(codiconsDestFolder)) {
  fs.mkdirSync(codiconsDestFolder, { recursive: true });
}
fs.copySync(
  './node_modules/@vscode/codicons/dist/codicon.css',
  join(codiconsDestFolder, 'codicon.css'),
);
fs.copySync(
  './node_modules/@vscode/codicons/dist/codicon.ttf',
  join(codiconsDestFolder, 'codicon.ttf'),
);

// copy nx
// const nxGraphDestFolder = normalize(
//   './dist/apps/vscode/node_modules/nx/src/core/graph'
// );
// if (!fs.existsSync(nxGraphDestFolder)) {
//   fs.mkdirSync(nxGraphDestFolder, { recursive: true });
// }
// fs.copySync(normalize('./node_modules/nx/src/core/graph'), nxGraphDestFolder);
