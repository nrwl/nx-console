import { Disposable, ExtensionContext } from 'vscode';
import { NotificationType } from 'vscode-languageclient/node';
export declare function configureLspClient(context: ExtensionContext): Promise<Disposable>;
export declare function sendNotification<P>(notificationType: NotificationType<P>): void;
