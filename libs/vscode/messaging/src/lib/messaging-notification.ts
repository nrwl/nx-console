import {
  NotificationHandler,
  NotificationHandler2,
  NotificationType,
  NotificationType2,
  RequestHandler,
  RequestHandler0,
  RequestType,
  RequestType0,
} from 'vscode-jsonrpc/node';

export interface MessagingNotification<T = any> {
  type: NotificationType<T>;
  handler: (id: string) => NotificationHandler<T>;
  onClose?: (id: string) => void;
}

export interface MessagingNotification2<T = any, T2 = any> {
  type: NotificationType2<T, T2>;
  handler: (id: string) => NotificationHandler2<T, T2>;
  onClose?: (id: string) => void;
}

export interface MessagingRequest<TParams = any, TResult = any> {
  type: RequestType<TParams, TResult, void>;
  handler: (id: string) => RequestHandler<TParams, TResult, void>;
  onClose?: (id: string) => void;
}

export interface MessagingRequest0<TResult = any> {
  type: RequestType0<TResult, void>;
  handler: (id: string) => RequestHandler0<TResult, void>;
  onClose?: (id: string) => void;
}
