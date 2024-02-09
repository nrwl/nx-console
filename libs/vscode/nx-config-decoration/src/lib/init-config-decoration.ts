import { registerCodeLensProvider } from '@nx-console/vscode/utils';
import { ExtensionContext } from 'vscode';
import { updatePluginTargetDecorationsOnEditorChange } from './plugin-target-decorations';
import { WorkspaceCodeLensProvider } from './workspace-codelens-provider';

export function initNxConfigDecoration(context: ExtensionContext) {
  registerCodeLensProvider(new WorkspaceCodeLensProvider());
  updatePluginTargetDecorationsOnEditorChange(context);
}
