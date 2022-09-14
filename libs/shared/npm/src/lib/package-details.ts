import { readAndCacheJsonFile } from '@nx-console/shared/file-system';
import { join } from 'path';

export async function packageDetails(packagePath: string) {
  const { json } = await readAndCacheJsonFile(
    join(packagePath, 'package.json')
  );
  return {
    packagePath,
    packageName: json.name,
    packageJson: json,
  };
}
