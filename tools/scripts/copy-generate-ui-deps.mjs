import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const files = [
  join('@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.js'),
  join('@vscode', 'codicons', 'dist', 'codicon.css'),
  join('@vscode', 'codicons', 'dist', 'codicon.ttf'),
];

const outputPath = 'dist/apps/generate-ui-v2';

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
