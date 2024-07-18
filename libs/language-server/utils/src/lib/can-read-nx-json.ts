import {
  findNxPackagePath,
  importWorkspaceDependency,
} from '@nx-console/shared/npm';
import { readFileSync } from 'fs';
import { join } from 'path';
import type * as NxFileUtils from 'nx/src/utils/fileutils';
import type { NxJsonConfiguration } from 'nx/src/devkit-exports';

export async function readNxJson(
  workspacePath: string
): Promise<NxJsonConfiguration> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'utils', 'fileutils.js')
  );
  if (importPath) {
    const fileUtils = await importWorkspaceDependency<typeof NxFileUtils>(
      importPath
    );
    return fileUtils.readJsonFile(join(workspacePath, 'nx.json'), {
      allowTrailingComma: true,
      expectComments: true,
    });
  } else {
    const filePath = join(workspacePath, 'nx.json');
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }
}

export async function canReadNxJson(workspacePath: string): Promise<boolean> {
  try {
    await readNxJson(workspacePath);
    return true;
  } catch (e) {
    return false;
  }
}
