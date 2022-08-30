import { dirname, join } from 'path';
import { fileExists } from '@nx-console/file-system';

export async function forEachAncestorDirectory(
  directory: string,
  callback: (directory: string) => Promise<string | undefined>
): Promise<string | undefined> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await callback(directory);
    if (result !== undefined) {
      return result;
    }

    const parentPath = dirname(directory);
    if (parentPath === directory) {
      return undefined;
    }

    directory = parentPath;
  }
}

export async function findConfig(
  searchPath: string,
  configName: string
): Promise<string | undefined> {
  return forEachAncestorDirectory(searchPath, async (ancestor) => {
    const fileName = join(ancestor, configName);
    try {
      if (await fileExists(fileName)) {
        return fileName;
      }
    } catch (e) {
      return undefined;
    }
  });
}
