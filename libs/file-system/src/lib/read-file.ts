import { crossFs } from './cache-json';

export async function readFile(filePath: string): Promise<string> {
  try {
    return crossFs.readFilePromise(filePath, 'utf8');
  } catch {
    return '';
  }
}
