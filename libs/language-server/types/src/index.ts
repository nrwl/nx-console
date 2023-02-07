import { NotificationType, RequestType } from 'vscode-languageserver/node';
import { NxWorkspace } from '@nx-console/shared/types';
import {
  CollectionInfo,
  Option,
  TaskExecutionSchema,
} from '@nx-console/shared/schema';
import { ProjectConfiguration } from '@nrwl/devkit';

export const NxChangeWorkspace: NotificationType<string> = new NotificationType(
  'nx/changeWorkspace'
);

export const NxWorkspaceRefreshNotification: NotificationType<void> =
  new NotificationType('nx/refreshWorkspace');

export const NxWorkspaceRequest: RequestType<
  { reset: boolean },
  NxWorkspace,
  unknown
> = new RequestType('nx/workspace');

export type NxGeneratorsRequestOptions = {
  includeHidden: boolean;
  includeNgAdd: boolean;
};

export const NxGeneratorsRequest: RequestType<
  {
    options?: NxGeneratorsRequestOptions;
  },
  CollectionInfo[],
  unknown
> = new RequestType('nx/generators');

export type NxGeneratorOptionsRequestOptions = {
  collection: string;
  name: string;
  path: string;
};

export const NxGeneratorOptionsRequest: RequestType<
  { options: NxGeneratorOptionsRequestOptions },
  Option[],
  unknown
> = new RequestType('nx/generatorOptions');

export const NxProjectByPathRequest: RequestType<
  { projectPath: string },
  ProjectConfiguration | null,
  unknown
> = new RequestType('nx/project-by-path');

export const NxGeneratorContextFromPathRequest: RequestType<
  {
    generator: TaskExecutionSchema;
    path: string;
  },
  | {
      path?: string;
      directory?: string;
      project?: string;
      projectName?: string;
    }
  | undefined,
  unknown
> = new RequestType('nx/generator-context-from-path');
