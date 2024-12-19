import { registerCodeLensProvider } from '@nx-console/vscode-utils';
import { ExtensionContext } from 'vscode';
import { WorkspaceCodeLensProvider } from './workspace-codelens-provider';

export function initNxConfigDecoration(context: ExtensionContext) {
  registerCodeLensProvider(new WorkspaceCodeLensProvider());
}
