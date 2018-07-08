import * as fs from 'fs';
import { spawn } from 'child_process';

export function readEditors() {
  const editors = [];
  if (hasFinder()) {
    editors.push({ name: 'Finder', icon: 'finder' });
  }
  if (hasVsCode()) {
    editors.push({ name: 'VS Code', icon: 'vscode' });
  }
  if (hasWebStorm()) {
    editors.push({ name: 'WebStorm', icon: 'webstorm' });
  }
  if (hasIntellij()) {
    editors.push({ name: 'IntelliJ IDEA', icon: 'intellij' });
  }
  return editors;
}

export function openInEditor(editor: string, path: string) {
  if (editor === 'Finder') {
    openInFinder(path);
  } else if (editor === 'VS Code') {
    openInVsCode(path);
  } else if (editor === 'WebStorm') {
    openInWebStorm(path);
  } else if (editor === 'IntelliJ IDEA') {
    openInIntelliJ(path);
  } else {
    throw new Error(`Unknown editor: ${editor}`);
  }
}

function hasFinder() {
  return true;
}

function hasVsCode() {
  try {
    const apps = fs.readdirSync('/Applications');
    return apps.indexOf('Visual Studio Code.app') > -1;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function hasWebStorm() {
  try {
    const apps = fs.readdirSync('/Applications');
    return apps.indexOf('WebStorm.app') > -1;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function hasIntellij() {
  try {
    const apps = fs.readdirSync('/Applications');
    return apps.indexOf('IntelliJ IDEA') > -1;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function openInFinder(path: string) {
  spawn('open', [path], { detached: true });
}

function openInVsCode(path: string) {
  spawn('open', ['-a', 'Visual Studio Code', path], { detached: true });
}

function openInWebStorm(path: string) {
  spawn('open', ['-a', 'WebStorm', path], { detached: true });
}

function openInIntelliJ(path: string) {
  spawn('open', ['-a', 'IntelliJ IDEA', path], { detached: true });
}
