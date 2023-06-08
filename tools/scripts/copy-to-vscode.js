const fs = require('fs-extra');

fs.copySync('./dist/apps/nxls', './dist/apps/vscode/nxls');
// TODO: ONLY ONE COPY
fs.copySync('./dist/apps/generate-ui', './dist/apps/vscode/generate-ui');
fs.copySync('./dist/apps/generate-ui-v2', './dist/apps/vscode/generate-ui-v2');
