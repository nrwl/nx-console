/**
 * This is needed because the CLI keeps insisting on not having angular.json anywhere in the parent directory.
 * Since we are running ng from within dist, we have to patch the cli to remove this check.
 */

const fs = require('fs');
const path = require('path');

patch(`./dist/server/node_modules/@angular/cli/lib/cli/index.js`);

fs.readdirSync('./dist/packages').forEach(dir => {
  try {
    patch(path.join('./dist/packages', dir, 'resources', 'app', 'node_modules/@angular/cli/lib/cli/index.js'));
  }  catch (e) {
  }
});

function patch(path) {
  const file = fs.readFileSync(path).toString();
  const patched = file.replace("const [, localPath] = config_1.getWorkspaceRaw('local');", "const localPath = null;");
  fs.writeFileSync(path, patched);
}
