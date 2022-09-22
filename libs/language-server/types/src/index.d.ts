import { RequestType, NotificationType } from 'vscode-languageserver/node';
import type { NxWorkspaceConfiguration } from '@nx-console/shared/workspace';
export declare const NxWorkspaceRefreshNotification: NotificationType<void>;
export declare const NxWorkspaceRequest: RequestType<void, NxWorkspaceConfiguration, unknown>;
