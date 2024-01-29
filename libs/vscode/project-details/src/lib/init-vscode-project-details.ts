import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import {
  getNxVersion,
  getNxWorkspacePath,
  getProjectByPath,
  getSourceMapFilesToProjectMap,
} from '@nx-console/vscode/nx-workspace';
import { showNoProjectAtPathMessage } from '@nx-console/vscode/utils';
import { dirname, join } from 'path';
import { gte } from 'semver';
import {
  ExtensionContext,
  Uri,
  ViewColumn,
  commands,
  window,
  workspace,
} from 'vscode';
import { ProjectDetailsCodelensProvider } from './project-details-codelens-provider';
import { ProjectDetailsManager } from './project-details-manager';
import { ProjectDetailsProvider } from './project-details-provider';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';

export function initVscodeProjectDetails(context: ExtensionContext) {
  getNxWorkspacePath().then((nxWorkspacePath) => {
    commands.executeCommand('setContext', 'nxConsole.ignoredPDVPaths', [
      join(nxWorkspacePath, 'package.json'),
    ]);
  });
  getNxVersionAndRegisterCommand(context);
  setProjectDetailsFileContext();

  ProjectDetailsCodelensProvider.register(context);
}

function getNxVersionAndRegisterCommand(context: ExtensionContext) {
  getNxVersion().then((nxVersion) => {
    // eslint-disable-next-line no-constant-condition
    if (gte(nxVersion.version, '17.3.0-beta.3')) {
      const projectDetailsManager = new ProjectDetailsManager(context);
      commands.registerCommand(
        'nx.project-details.openToSide',
        (expandTarget?: string) => {
          const isEnabled = GlobalConfigurationStore.instance.get(
            'showProjectDetailsView'
          );
          if (!isEnabled) return;
          const document = window.activeTextEditor?.document;
          if (!document) return;
          projectDetailsManager.openProjectDetailsToSide(
            document,
            expandTarget
          );
        }
      );
    } else {
      const projectDetailsProvider = new ProjectDetailsProvider();
      workspace.registerTextDocumentContentProvider(
        'project-details',
        projectDetailsProvider
      );
      commands.registerCommand('nx.project-details.openToSide', async () => {
        const isEnabled = GlobalConfigurationStore.instance.get(
          'showProjectDetailsView'
        );
        if (!isEnabled) return;
        const uri = window.activeTextEditor?.document.uri;
        if (!uri) return;
        const project = await getProjectByPath(uri.path);
        if (!project) {
          showNoProjectAtPathMessage(uri.path);
          return;
        }
        const doc = await workspace.openTextDocument(
          Uri.parse(`project-details:${project.name}.project.json`)
        );
        await window.showTextDocument(doc, {
          preview: false,
          viewColumn: ViewColumn.Beside,
        });
      });
    }
  });
}

async function setProjectDetailsFileContext() {
  const setContext = async () => {
    const sourceMapFilesToProjectMap = await getSourceMapFilesToProjectMap();
    const nxWorkspacePath = await getNxWorkspacePath();
    const pdvPaths = [
      ...new Set(
        Object.keys(sourceMapFilesToProjectMap).flatMap((path) => [
          join(nxWorkspacePath, path),
          join(nxWorkspacePath, dirname(path), 'package.json'),
        ])
      ),
    ];
    commands.executeCommand('setContext', 'nxConsole.pdvPaths', pdvPaths);
  };

  setContext();
  onWorkspaceRefreshed(() => setContext());
}
