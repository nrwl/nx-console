import { RequestType, NotificationType } from 'vscode-languageserver/node';
import type { NxWorkspaceConfiguration } from '@nx-console/shared/workspace';

export const NxWorkspaceRefreshNotification: NotificationType<void> =
  new NotificationType('nx/refreshWorkspace');

export const NxWorkspaceRequest: RequestType<
  void,
  NxWorkspaceConfiguration,
  unknown
> = new RequestType('nx/workspace');
