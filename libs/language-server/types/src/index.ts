import { NotificationType, RequestType } from 'vscode-languageserver/node';
import { NxWorkspace } from '@nx-console/shared/types';
import { CollectionInfo, WorkspaceProjects } from '@nx-console/shared/schema';
import { GetGeneratorsOptions } from '@nx-console/shared/collections';

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

export const NxGeneratorsRequest: RequestType<
  {
    projects?: WorkspaceProjects;
    options?: GetGeneratorsOptions;
  },
  CollectionInfo[],
  unknown
> = new RequestType('nx/generators');
