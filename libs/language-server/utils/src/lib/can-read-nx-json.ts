import { readFileSync } from 'fs';
import { join } from 'path';

export function readNxJson(workspacePath: string): any {
  const filePath = join(workspacePath, 'nx.json');
  const content = readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

export function canReadNxJson(workspacePath: string): any {
  try {
    readNxJson(workspacePath);
    return true;
  } catch (e) {
    return false;
  }
}
