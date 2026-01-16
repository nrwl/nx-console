import { stat } from 'fs/promises';

export async function directoryExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}
