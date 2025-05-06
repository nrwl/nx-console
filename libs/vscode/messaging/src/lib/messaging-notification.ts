import { NotificationHandler, NotificationType } from 'vscode-jsonrpc/node';

export interface MessagingNotification<T = any> {
  type: NotificationType<T>;
  handler: NotificationHandler<T>;
}
