import { URI } from 'vscode-uri';
import { stat } from 'fs/promises';

export async function directoryExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(URI.parse(filePath).fsPath)).isDirectory();
  } catch {
    return false;
  }
}
