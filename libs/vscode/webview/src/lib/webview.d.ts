import { ExtensionContext, TreeView, Uri, Webview, WebviewPanel } from 'vscode';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { RunTargetTreeItem } from '@nx-console/vscode/nx-run-target-view';
import { TaskExecutionSchema } from '@nx-console/shared/schema';
interface RevealWebViewPanelConfig {
    context: ExtensionContext;
    runTargetTreeItem: RunTargetTreeItem;
    cliTaskProvider: CliTaskProvider;
    runTargetTreeView: TreeView<RunTargetTreeItem>;
    contextMenuUri?: Uri;
    generator?: string;
}
export declare function revealWebViewPanel({ context, cliTaskProvider, runTargetTreeItem, runTargetTreeView, contextMenuUri, generator, }: RevealWebViewPanelConfig): Promise<WebviewPanel | undefined>;
export declare function createWebViewPanel(context: ExtensionContext, schema: TaskExecutionSchema, title: string, cliTaskProvider: CliTaskProvider): WebviewPanel;
export declare function getIframeHtml(webView: Webview, context: ExtensionContext, schema: TaskExecutionSchema): string;
export {};
