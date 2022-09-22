import { Disposable, WebviewPanel } from 'vscode';
import { MessageType } from './graph-message-type';
export declare class GraphWebView implements Disposable {
    panel: WebviewPanel | undefined;
    constructor();
    dispose(): void;
    private _webview;
    projectInWebview(projectName: string | undefined, type: MessageType): Promise<void>;
    refresh(): void;
}
