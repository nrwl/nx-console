import { Config } from '@jest/types';
import { execSync } from 'child_process';
import { join } from 'path';

export default async function (globalConfig: Config.ConfigGlobals[]) {
  execSync('npx nx run nxls:build --verbose', {
    stdio: 'inherit',
    windowsHide: true,
    cwd: join(__dirname, '..', '..'),
  });
}
