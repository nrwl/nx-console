import { ExtensionContext, commands, window } from 'vscode';
import { ProjectDetailsManager } from './project-details-manager';

export function initVscodeProjectDetails(context: ExtensionContext) {
  const projectDetailsManager = new ProjectDetailsManager(context);
  commands.registerCommand('nx.project-details.openToSide', () => {
    const uri = window.activeTextEditor?.document.uri;
    if (!uri) return;
    projectDetailsManager.openProjectDetailsToSide(uri);
  });
}
