import { ExtensionContext } from 'vscode';
import { WorkspaceCodeLensProvider } from './workspace-codelens-provider';

export function initNxConfigDecoration(context: ExtensionContext) {
  WorkspaceCodeLensProvider.register(context);
}
