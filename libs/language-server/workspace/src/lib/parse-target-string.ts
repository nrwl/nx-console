import type { Target } from 'nx/src/devkit-exports';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { parseTargetString as parseTargetStringUtil } from '@nx-console/shared-npm';
import { lspLogger } from '@nx-console/language-server-utils';

export async function parseTargetString(
  targetString: string,
  workspacePath: string,
): Promise<Target | undefined> {
  const { projectGraph } = await nxWorkspace(workspacePath, lspLogger);

  try {
    return await parseTargetStringUtil(
      targetString,
      projectGraph,
      workspacePath,
    );
  } catch (e) {
    lspLogger.log(`Error parsing target string: ${e}`);
    return undefined;
  }
}
