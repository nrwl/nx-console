import { ExtensionContext, window } from 'vscode';
import { NxHelpAndFeedbackProvider } from './nx-help-and-feedback-provider';

export function initHelpAndFeedbackView(context: ExtensionContext) {
  const nxHelpAndFeedbackTreeView = window.createTreeView('nxHelpAndFeedback', {
    treeDataProvider: new NxHelpAndFeedbackProvider(context),
  });

  context.subscriptions.push(nxHelpAndFeedbackTreeView);
}
