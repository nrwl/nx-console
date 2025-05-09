import {
  NotificationHandler,
  NotificationHandler2,
  NotificationType,
  NotificationType2,
} from 'vscode-jsonrpc/node';

export interface MessagingNotification<T = any> {
  type: NotificationType<T>;
  handler: NotificationHandler<T>;
}

export interface MessagingNotification2<T = any, T2 = any> {
  type: NotificationType2<T, T2>;
  handler: NotificationHandler2<T, T2>;
}
