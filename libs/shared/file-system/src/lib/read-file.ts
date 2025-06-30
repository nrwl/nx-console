import { PosixFS } from '@yarnpkg/fslib';
import { ZipOpenFS, getLibzipSync as libzip } from '@yarnpkg/libzip';

const zipOpenFs = new ZipOpenFS({ libzip });
export const crossFs = new PosixFS(zipOpenFs);

export async function readFile(filePath: string): Promise<string> {
  try {
    return crossFs.readFilePromise(filePath, 'utf8');
  } catch {
    return '';
  }
}
