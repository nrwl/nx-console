const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const srcPackageJsonPath = path.resolve(__dirname, 'package.json');
const srcServerJsonPath = path.resolve(__dirname, 'server.json');
const distDir = path.resolve(rootDir, 'dist/apps/nx-mcp');
const distMainJsPath = path.resolve(distDir, 'main.js');
const distPackageJsonPath = path.resolve(distDir, 'package.json');
const distServerJsonPath = path.resolve(distDir, 'server.json');

console.log('Copying package.json to dist folder (removing nx property)...');
const packageJson = JSON.parse(fs.readFileSync(srcPackageJsonPath, 'utf8'));
const version = packageJson.version;
delete packageJson.nx;
fs.writeFileSync(
  distPackageJsonPath,
  JSON.stringify(packageJson, null, 2) + '\n',
);
console.log('Package.json copied');

console.log(
  'Copying server.json to dist folder (replacing PLACEHOLDER_VERSION)...',
);
const serverJsonContent = fs.readFileSync(srcServerJsonPath, 'utf8');
const updatedServerJsonContent = serverJsonContent.replace(
  /PLACEHOLDER_VERSION/g,
  version,
);
fs.writeFileSync(distServerJsonPath, updatedServerJsonContent);
console.log(`Server.json copied with version ${version}`);

console.log('Adding shebang to main.js...');
const mainJsContent = fs.readFileSync(distMainJsPath, 'utf8');
const shebang = '#!/usr/bin/env node\n';

if (!mainJsContent.startsWith(shebang)) {
  fs.writeFileSync(distMainJsPath, shebang + mainJsContent);
  console.log('Shebang added');
} else {
  console.log('Shebang already present');
}

console.log('Setup completed successfully!');
