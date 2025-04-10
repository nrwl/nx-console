import { existsSync, readFileSync } from 'fs';
import { parse } from 'ini';
import { join } from 'path';
import os from 'node:os';

export function getNxCloudConfigIni(): any | undefined {
  const iniLocation = findExistingNxCloudConfigFile();

  if (iniLocation && existsSync(iniLocation)) {
    try {
      const data = readFileSync(iniLocation, 'utf-8');
      return parse(data);
    } catch (e) {
      return;
    }
  }
}

const NX_CLOUD_CONFIG_DIR_NAME = 'nxcloud';
const NX_CLOUD_CONFIG_FILE_NAME = 'nxcloud.ini';
const DOT_NX_CLOUD_CONFIG_FILE_NAME = `.${NX_CLOUD_CONFIG_FILE_NAME}`;

/*
On Windows, we first check to see if the user has a config file in either
- %LOCALAPPDATA%\nxcloud\nxcloud.ini
- %USERPROFILE%\.nxcloud.ini

For Unix-based systems, we check to see if the user has configured a config either
- $XDG_CONFIG_HOME/nxcloud/nxcloud.ini
- $HOME/.config/nxcloud/nxcloud.ini
- $HOME/.nxcloud.ini
*/
function findExistingNxCloudConfigFile() {
  if (process.platform === 'win32') {
    const homePath = join(os.homedir(), DOT_NX_CLOUD_CONFIG_FILE_NAME);
    if (existsSync(homePath)) {
      return homePath;
    }
    if (process.env.LOCALAPPDATA) {
      const localAppDataPath = join(
        process.env.LOCALAPPDATA,
        NX_CLOUD_CONFIG_DIR_NAME,
        NX_CLOUD_CONFIG_FILE_NAME,
      );
      if (existsSync(localAppDataPath)) {
        return localAppDataPath;
      }
    }
  } else {
    if (process.env.XDG_CONFIG_HOME) {
      const xdgPath = join(
        process.env.XDG_CONFIG_HOME,
        NX_CLOUD_CONFIG_DIR_NAME,
        NX_CLOUD_CONFIG_FILE_NAME,
      );
      if (existsSync(xdgPath)) {
        return xdgPath;
      }
    }
    const homeDir = os.homedir();
    const homeDotPath = join(homeDir, DOT_NX_CLOUD_CONFIG_FILE_NAME);
    if (existsSync(homeDotPath)) {
      return homeDotPath;
    }
    const homeConfigPath = join(
      homeDir,
      '.config',
      NX_CLOUD_CONFIG_DIR_NAME,
      NX_CLOUD_CONFIG_FILE_NAME,
    );
    if (existsSync(homeConfigPath)) {
      return homeConfigPath;
    }
  }
  return null;
}
