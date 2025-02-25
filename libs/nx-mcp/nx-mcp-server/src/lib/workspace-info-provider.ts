import { NxGeneratorsRequestOptions } from '@nx-console/language-server-types';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { NxWorkspace } from '@nx-console/shared-types';
import { Logger } from '@nx-console/shared-utils';

export interface WorkspaceInfoProvider {
  nxWorkspace: (
    workspacePath: string,
    logger: Logger,
    reset?: boolean,
  ) => Promise<NxWorkspace>;
  getGenerators: (
    workspacePath: string,
    options?: NxGeneratorsRequestOptions,
    logger?: Logger,
  ) => Promise<GeneratorCollectionInfo[]>;
}
