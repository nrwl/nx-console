import { exec } from 'child_process';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from 'fs';
import { basename, dirname, join } from 'path';
import { promisify } from 'util';
import { SevereServiceError } from 'webdriverio';

import { getTestWorkspacePath } from '../specs/utils';

export class TestworkspaceInstallationService {
  async onPrepare() {
    const testWorkspacePath = getTestWorkspacePath();
    if (existsSync(testWorkspacePath)) {
      rmSync(testWorkspacePath, { recursive: true, force: true });
    }

    // copy testworkspaces and remove after running the tests
    copyFolderRecursiveSync(`./testworkspaces`, dirname(testWorkspacePath));
    const testWorkspaces = readdirSync(testWorkspacePath, {
      withFileTypes: true,
    }).filter((dirent) => dirent.isDirectory());

    process.on('exit', () => {
      rmSync(testWorkspacePath, { recursive: true, force: true });
    });

    console.log('installing testworkspace dependencies....');
    console.time('done in');
    await Promise.all(
      testWorkspaces.map(async (tws) => {
        await promisify(exec)('npm ci', {
          cwd: join(testWorkspacePath, tws.name),
        }).catch((e) => {
          throw new SevereServiceError();
          // `Failed to install dependencies for ${tws.name}: \n ${e}`
        });
      })
    );

    console.timeLog('done in');
  }
}

function copyFolderRecursiveSync(source: string, target: string) {
  // Check if folder needs to be created or integrated
  const targetFolder = join(target, basename(source));
  if (!existsSync(targetFolder)) {
    mkdirSync(targetFolder);
  }

  // Copy everything but ignore node_modules
  if (lstatSync(source).isDirectory() && !source.includes('node_modules')) {
    const files = readdirSync(source);
    files.forEach(function (file) {
      const curSource = join(source, file);
      if (lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        copyFileSync(curSource, join(targetFolder, file));
      }
    });
  }
}
