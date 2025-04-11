import type { NxJsonConfiguration } from 'nx/src/devkit-exports';
import { readJsonFile } from './local-nx-utils/read-json';

export async function readNxJson(
  workspacePath: string,
): Promise<NxJsonConfiguration> {
  return await readJsonFile<NxJsonConfiguration>('nx.json', workspacePath);
}

export async function canReadNxJson(workspacePath: string): Promise<boolean> {
  try {
    await readNxJson(workspacePath);
    return true;
  } catch (e) {
    return false;
  }
}

// helpers
