const fs = require('fs-extra');

fs.copySync('./dist/apps/nxls', './dist/apps/vscode/nxls');
fs.copySync('./dist/apps/generate-ui', './dist/apps/vscode/generate-ui');
