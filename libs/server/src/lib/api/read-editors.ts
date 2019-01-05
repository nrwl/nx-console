import { exec, execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

import { exists, findExecutable, hasExecutable, openURI } from '../utils';

export function readEditors() {
  const editors: { name: Editor; icon: string }[] = [];
  if (os.platform() === 'darwin') {
    editors.push({ name: 'Finder', icon: 'finder' });
    editors.push({ name: 'Terminal', icon: 'terminal' });
  }
  if (hasNautilus()) {
    editors.push({ name: 'Files', icon: 'nautilus' });
  }
  if (hasExplorer()) {
    editors.push({ name: 'Explorer', icon: 'explorer' });
  }
  if (hasWebStorm()) {
    editors.push({ name: 'WebStorm', icon: 'webstorm' });
  }
  if (hasIntellij()) {
    editors.push({ name: 'IntelliJ IDEA', icon: 'intellij' });
  }
  if (hasVsCode()) {
    editors.push({ name: 'VS Code', icon: 'vscode' });
  }
  if (hasVsCode({ insiders: true })) {
    editors.push({ name: 'VS Code - Insiders', icon: 'vscode-insiders' });
  }
  return editors;
}

export type Editor =
  | 'Finder'
  | 'Terminal'
  | 'Files'
  | 'Explorer'
  | 'VS Code'
  | 'VS Code - Insiders'
  | 'WebStorm'
  | 'IntelliJ IDEA';

export function openInEditor(
  editor: Editor,
  path: string,
  serverAddress: string
) {
  switch (editor) {
    case 'Finder':
      return openInFinder(path);
    case 'Terminal':
      return openInOsXTerminal(path);
    case 'Files':
      return openInNautilus(path);
    case 'Explorer':
      return openInExplorer(path);
    case 'VS Code':
      return openInVsCode(path);
    case 'VS Code - Insiders':
      return openInVsCode(path, { insiders: true });
    case 'WebStorm':
      return openInWebStorm(path);
    case 'IntelliJ IDEA':
      return openInIntelliJ(path);
    default:
      throw new Error(`Unknown editor: ${editor}`);
  }
}

function hasNautilus() {
  return exists('nautilus');
}

function hasExplorer() {
  return os.platform() === 'win32';
}

function hasVsCode(config: { insiders: boolean } = { insiders: false }) {
  const { insiders } = config;

  if (os.platform() === 'darwin') {
    try {
      const apps = fs.readdirSync('/Applications');
      const appName = insiders
        ? 'Visual Studio Code - Insiders.app'
        : 'Visual Studio Code.app';
      return apps.indexOf(appName) > -1;
    } catch (e) {
      return false;
    }
  } else if (os.platform() === 'linux') {
    return exists(insiders ? 'code-insiders' : 'code');
  } else if (os.platform() === 'win32') {
    try {
      return (
        execSync(`${insiders ? 'code-insiders' : 'code'} --version`)
          .toString()
          .indexOf('is not recognized') === -1
      );
    } catch (e) {
      return false;
    }
  } else {
    return false;
  }
}

function hasWebStorm() {
  if (os.platform() === 'darwin') {
    try {
      const apps = fs.readdirSync('/Applications');
      return apps.indexOf('WebStorm.app') > -1;
    } catch (e) {
      return false;
    }
  } else if (os.platform() === 'linux') {
    return exists('wstorm') || exists('webstorm.sh');
  } else if (os.platform() === 'win32') {
    return hasExecutable('webstorm', process.cwd());
  } else {
    return false;
  }
}

function hasIntellij() {
  if (os.platform() === 'darwin') {
    try {
      const apps = fs.readdirSync('/Applications');
      return apps.indexOf('IntelliJ IDEA.app') > -1;
    } catch (e) {
      return false;
    }
  } else if (os.platform() === 'linux') {
    return exists('idea');
  } else if (os.platform() === 'win32') {
    return hasExecutable('idea', process.cwd());
  } else {
    return false;
  }
}

function openInFinder(path: string) {
  if (os.platform() === 'darwin') {
    spawn('open', [path], { detached: true });
  }
}

function openInNautilus(path: string) {
  exec(`nautilus ${path}`);
}

function openInExplorer(path: string) {
  if (os.platform() === 'win32') {
    exec(`start "" "${path}"`);
  }
}

function openInVsCode(
  path: string,
  config: { insiders: boolean } = { insiders: false }
) {
  const { insiders } = config;
  if (os.platform() === 'darwin') {
    spawn(
      'open',
      [
        '-a',
        insiders ? 'Visual Studio Code - Insiders' : 'Visual Studio Code',
        path
      ],
      { detached: true }
    );
  } else if (os.platform() === 'linux') {
    exec(`${insiders ? 'code-insiders' : 'code'} ${path}`);
  } else if (os.platform() === 'win32') {
    exec(`${insiders ? 'code-insiders' : 'code'} "${toWindows(path)}"`);
  }
}

function openInOsXTerminal(path: string) {
  spawn('open', ['-a', 'Terminal', path], { detached: true });
}

function openInWebStorm(path: string) {
  if (os.platform() === 'darwin') {
    spawn('open', ['-a', 'WebStorm', path], { detached: true });
  } else if (os.platform() === 'linux') {
    if (exists('wstorm')) {
      exec(`wstorm ${path}`);
    } else {
      exec(`webstorm.sh ${path}`);
    }
  } else if (os.platform() === 'win32') {
    spawn(findExecutable('webstorm', process.cwd()), [toWindows(path)], {
      detached: true
    });
  }
}

function openInIntelliJ(path: string) {
  if (os.platform() === 'darwin') {
    spawn('open', ['-a', 'IntelliJ IDEA', path], { detached: true });
  } else if (os.platform() === 'linux') {
    exec(`idea ${path}`);
  } else if (os.platform() === 'win32') {
    spawn(findExecutable('idea', process.cwd()), [toWindows(path)], {
      detached: true
    });
  }
}

function toWindows(path: string): string {
  return path
    .split('/')
    .filter(p => !!p)
    .join('\\');
}
