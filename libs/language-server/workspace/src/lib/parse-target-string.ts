import type { Target } from 'nx/src/devkit-exports';
import { nxWorkspace } from './workspace';
import { parseTargetString as parseTargetStringUtil } from '@nx-console/shared-utils';
import { lspLogger } from '@nx-console/language-server-utils';

export async function parseTargetString(
  targetString: string,
  workspacePath: string
): Promise<Target | undefined> {
  const { projectGraph } = await nxWorkspace(workspacePath);

  try {
    return await parseTargetStringUtil(
      targetString,
      projectGraph,
      workspacePath
    );
  } catch (e) {
    lspLogger.log(`Error parsing target string: ${e}`);
    return undefined;
  }
}
