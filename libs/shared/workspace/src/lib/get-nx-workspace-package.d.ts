import type * as NxFileUtils from 'nx/src/project-graph/file-utils';
import type * as NxProjectGraph from 'nx/src/project-graph/project-graph';
import { Logger } from '@nx-console/shared/schema';
export declare function getNxProjectGraph(workspacePath: string, logger: Logger): Promise<typeof NxProjectGraph>;
/**
 * Get the local installed version of @nrwl/workspace
 */
export declare function getNxWorkspacePackageFileUtils(workspacePath: string, logger: Logger): Promise<typeof NxFileUtils>;
