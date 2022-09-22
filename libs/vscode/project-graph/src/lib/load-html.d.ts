import { WebviewPanel } from 'vscode';
export declare function loadNoProject(): string;
export declare function loadError(): string;
export declare function loadSpinner(): string;
export declare function loadHtml(panel: WebviewPanel): Promise<string>;
