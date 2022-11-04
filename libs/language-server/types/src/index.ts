import { NotificationType, RequestType } from 'vscode-languageserver/node';
import { NxWorkspace } from '@nx-console/shared/types';

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
