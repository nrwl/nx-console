import { Config } from '@jest/types';
import { execSync } from 'child_process';

export default async function (globalConfig: Config.ConfigGlobals[]) {
  execSync('npx nx run nxls:build', {
    stdio: 'inherit',
    windowsHide: true,
  });
}
