import {
  ExtensionContext,
  Position,
  Uri,
  ViewColumn,
  commands,
  window,
  workspace,
  Range,
  ThemeColor,
  DecorationOptions,
  TextEditorDecorationType,
  DecorationRangeBehavior,
} from 'vscode';
import { ProjectDetailsManager } from './project-details-manager';
import { ProjectDetailsProvider } from './project-details-provider';
import {
  getNxVersion,
  getNxWorkspacePath,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { showNoProjectAtPathMessage } from '@nx-console/vscode/utils';
import { parseJsonText } from 'typescript';
import { decorateWithProjectDetails } from './project-details-inline-decorations';
import { gte } from 'semver';
import { join } from 'path';
import {
  GlobalConfigurationStore,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode/configuration';

export function initVscodeProjectDetails(context: ExtensionContext) {
  getNxWorkspacePath().then((nxWorkspacePath) => {
    commands.executeCommand('setContext', 'nxConsole.ignoredPDVPaths', [
      join(nxWorkspacePath, 'package.json'),
    ]);
  });

  getNxVersion().then((nxVersion) => {
    // TODO: enable & replace with actual version that has nx graph api changes
    // eslint-disable-next-line no-constant-condition
    if (gte(nxVersion.version, '18.0.0')) {
      const projectDetailsManager = new ProjectDetailsManager(context);
      commands.registerCommand('nx.project-details.openToSide', () => {
        const isEnabled = GlobalConfigurationStore.instance.get(
          'showProjectDetailsView'
        );
        if (!isEnabled) return;
        const uri = window.activeTextEditor?.document.uri;
        if (!uri) return;
        projectDetailsManager.openProjectDetailsToSide(uri);
      });
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

  decorateWithProjectDetails();
}
// function highlightTargets() {
//   const activeEditor = window.activeTextEditor;
//   if (!activeEditor) return;

//   const document = activeEditor.document;
//   const text = document.getText();

//   const regex = /"targets"\s*:/g;
//   let match;

//   const decorationType = window.createTextEditorDecorationType({
//     borderColor: 'lightblue',
//     borderStyle: 'solid',
//     borderWidth: '1px',
//     borderRadius: '2px',
//   });

//   const ranges = [];

//   while ((match = regex.exec(text)) !== null) {
//     const startPos = document.positionAt(match.index);
//     const endPos = document.positionAt(match.index + match[0].length);
//     const range = new Range(startPos, endPos);
//     ranges.push(range);
//   }

//   activeEditor.setDecorations(decorationType, ranges);
// }

// const maxSmallIntegerV8 = 2 ** 30;
// const annotationDecoration: TextEditorDecorationType =
//   window.createTextEditorDecorationType({
//     after: {
//       margin: '0 0 0 3em',
//       textDecoration: 'none',
//     },
//     rangeBehavior: DecorationRangeBehavior.OpenOpen,
//   });

// function decorateSourceMaps() {
//   window.onDidChangeTextEditorSelection((e) => {
//     const line = e.selections[0].active.line;
//     const decorations = [];
//     const text = 'helloasdasdasd';
//     const decorationOptions = {
//       renderOptions: {
//         after: {
//           color: new ThemeColor('input.placeholderForeground'),
//           contentText: `${'\u00a0'.repeat(10)}${text.replace(/ /g, '\u00a0')}`,
//           fontWeight: 'normal',
//           fontStyle: 'normal',
//           // Pull the decoration out of the document flow if we want to be scrollable
//           textDecoration: `none;`, //${scrollable ? '' : ' position: absolute;'}`,
//         },
//       },
//       range: new Range(
//         new Position(line, maxSmallIntegerV8),
//         new Position(line, maxSmallIntegerV8)
//       ),
//     } as DecorationOptions;
//     decorations.push(decorationOptions);
//     window.activeTextEditor?.setDecorations(annotationDecoration, decorations);
//   });
// }

// function buildLineToPropertyMap(jsonText: string) {
//   const json = parseJsonText('workspace.json', jsonText);
// }
