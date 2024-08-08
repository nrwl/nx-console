import {
  listFiles,
  readAndCacheJsonFile,
} from '@nx-console/shared/file-system';
import { findConfig } from '@nx-console/shared/utils';
import { dirname, join } from 'path';

const TSCONFIG_LIB = 'tsconfig.lib.json';
export const TSCONFIG_BASE = 'tsconfig.base.json';

export async function getExternalFiles(
  workspaceRoot: string
): Promise<{ mainFile: string; directory: string }[]> {
  let tsconfig = (await readAndCacheJsonFile(TSCONFIG_BASE, workspaceRoot))
    .json;

  if (!('compilerOptions' in tsconfig)) {
    tsconfig = (await readAndCacheJsonFile('tsconfig.json', workspaceRoot))
      .json;
    if (!('compilerOptions' in tsconfig)) {
      return [];
    }
  }

  const paths = tsconfig.compilerOptions.paths ?? {};

  const externals: { mainFile: string; directory: string }[] = [];

  for (const [, values] of Object.entries<string[]>(paths)) {
    for (const value of values) {
      const mainFile = join(workspaceRoot, value);

      const configFilePath = await findConfig(mainFile, TSCONFIG_LIB);

      if (!configFilePath) {
        continue;
      }

      if (mainFile.endsWith('/*') || mainFile.endsWith('\\*')) {
        const files = listFiles(dirname(mainFile));
        for (const file of files) {
          const directory = dirname(configFilePath);
          externals.push({ mainFile: file, directory });
        }
      } else {
        const directory = dirname(configFilePath);
        externals.push({ mainFile, directory });
      }
    }
  }

  return externals;
}
