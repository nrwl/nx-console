import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const args = process.argv.slice(2);
const outputPath = args[0];

const files = [
  join('@vscode', 'codicons', 'dist', 'codicon.css'),
  join('@vscode', 'codicons', 'dist', 'codicon.ttf'),
];

if (!existsSync('node_modules')) {
  throw new Error(
    'Please make sure node_modules are installed by running yarn.'
  );
}

files.forEach((file) => {
  const path = join('node_modules', file);
  const destination = join(outputPath, file);
  const targetFolder = dirname(destination);

  if (!existsSync(targetFolder)) {
    mkdirSync(targetFolder, { recursive: true });
  }
  copyFileSync(path, destination);
});
