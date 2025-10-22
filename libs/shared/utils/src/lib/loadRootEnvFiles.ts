import { config as loadDotEnvFile } from 'dotenv';
import { expand } from 'dotenv-expand';
import { join } from 'path';

/**
 * This loads dotenv files from:
 * - .env
 * - .local.env
 * - .env.local
 */
export function loadRootEnvFiles(
  root: string,
  targetEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  let expandedEnv: NodeJS.ProcessEnv = {
    ...targetEnv,
  };
  for (const file of ['.local.env', '.env.local', '.env']) {
    const myEnv = loadDotEnvFile({
      path: join(root, file),
      processEnv: targetEnv,
      override: true,
    });
    const expanded = expand({
      ...myEnv,
      processEnv: expandedEnv,
    });
    if (expanded.parsed) {
      expandedEnv = {
        ...expandedEnv,
        ...expanded.parsed,
      };
    }
  }
  return expandedEnv;
}
