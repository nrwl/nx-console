import { join } from 'path';
import { findNxPackagePath } from './find-nx-package-path';
import { importWorkspaceDependency } from './workspace-dependencies';
import type * as NxFileUtils from 'nx/src/utils/fileutils';
import { readFileSync } from 'fs';

export async function readJsonFile<T>(
  jsonPath: string,
  workspacePath: string
): Promise<T> {
  const importPath = await findNxPackagePath(
    workspacePath,
    join('src', 'utils', 'fileutils.js')
  );
  if (importPath) {
    const fileUtils = await importWorkspaceDependency<typeof NxFileUtils>(
      importPath
    );
    return fileUtils.readJsonFile(join(workspacePath, jsonPath), {
      allowTrailingComma: true,
      expectComments: true,
    }) as any;
  } else {
    const filePath = join(workspacePath, 'nx.json');
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }
}
