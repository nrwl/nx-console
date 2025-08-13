import { readJsonFile } from '@nx-console/shared-file-system';
import { Logger } from '@nx-console/shared-utils';
import { join } from 'path';

/**
 * Detects if Corepack is being used by checking the packageManager field in package.json
 * @param workspacePath The workspace path
 * @param logger Optional logger
 * @returns The packageManager string (e.g., "yarn@4.7.0") or undefined if not using Corepack
 */
export async function detectCorepackPackageManager(
  workspacePath: string,
  logger?: Logger,
): Promise<string | undefined> {
  try {
    const packageJsonPath = join(workspacePath, 'package.json');
    const { json } = await readJsonFile(packageJsonPath);
    
    if (json.packageManager && typeof json.packageManager === 'string') {
      logger?.log(`Detected Corepack package manager: ${json.packageManager}`);
      return json.packageManager;
    }
    
    return undefined;
  } catch (e) {
    logger?.log(`Error detecting Corepack package manager: ${JSON.stringify(e)}`);
    return undefined;
  }
}

/**
 * Checks if Corepack should be used for the given workspace
 * @param workspacePath The workspace path
 * @param logger Optional logger
 * @returns true if Corepack should be used
 */
export async function shouldUseCorepack(
  workspacePath: string,
  logger?: Logger,
): Promise<boolean> {
  const packageManager = await detectCorepackPackageManager(workspacePath, logger);
  return packageManager !== undefined;
}

/**
 * Extracts the package manager name from a Corepack packageManager string
 * @param packageManagerString The packageManager string (e.g., "yarn@4.7.0")
 * @returns The package manager name (e.g., "yarn")
 */
export function extractPackageManagerName(packageManagerString: string): string {
  const match = packageManagerString.match(/^([^@]+)/);
  return match ? match[1] : packageManagerString;
}