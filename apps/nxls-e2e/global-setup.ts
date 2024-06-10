import { Config } from '@jest/types';
import { execSync } from 'child_process';

export default async function (globalConfig: Config.ConfigGlobals[]) {
  execSync('npx nx run nxls:build --skip-nx-cache', {
    stdio: 'inherit',
    windowsHide: true,
  });
}
