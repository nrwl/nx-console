import { readdir } from 'fs/promises';

export async function readDirectory(path: string): Promise<string[]> {
  try {
    return readdir(path);
  } catch {
    return [];
  }
}
