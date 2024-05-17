const fs = require('fs');
const { execSync } = require('child_process');
const { join } = require('path');

console.log('cwd', process.cwd());
const nxlsPath = join(
  process.cwd(),
  'dist/apps/intellij/idea-sandbox/plugins/nx-console/nxls'
);
console.log('nxlsPath', nxlsPath);

try {
  // Log the contents of the current folder
  const files = fs.readdirSync(nxlsPath);
  console.log('Files in nxlsPath:');
  files.forEach((file) => {
    console.log(file);
  });

  const originalNxlsPath = join(process.cwd(), 'dist/apps/nxls');
  console.log('originalNxlsPath', originalNxlsPath);
  const originalNxlsFiles = fs.readdirSync(originalNxlsPath);
  console.log('Files in originalNxls:');
  originalNxlsFiles.forEach((file) => {
    console.log(file);
  });
} catch (e) {
  console.log('Error:', e.stack);
}

execSync(`npm i -f --verbose --prefix ${nxlsPath}`, { stdio: 'inherit' });
