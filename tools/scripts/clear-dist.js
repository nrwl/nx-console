const fs = require('fs');

fs.rmSync('./dist/apps/vscode', { recursive: true, force: true });
