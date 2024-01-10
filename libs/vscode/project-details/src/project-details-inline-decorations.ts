import { getTargetsPropertyLocation } from '@nx-console/vscode/nx-config-decoration';
import { getProjectByPath } from '@nx-console/vscode/nx-workspace';
import { ProjectConfiguration } from 'nx/src/devkit-exports';
import {
  DecorationOptions,
  DecorationRangeBehavior,
  MarkdownString,
  Position,
  Range,
  TextDocument,
  TextEditor,
  ThemeColor,
  window,
  workspace,
} from 'vscode';

const targetDecorationType = window.createTextEditorDecorationType({
  after: {
    margin: '0 0 0 1rem',
    textDecoration: 'none',
    height: '100px',
  },
  isWholeLine: true,
  rangeBehavior: DecorationRangeBehavior.OpenOpen,
});

export function decorateWithProjectDetails() {
  if (shouldDecorate(window.activeTextEditor)) {
    doDecoration(window.activeTextEditor);
  }
  window.onDidChangeActiveTextEditor((e) => {
    if (shouldDecorate(e)) {
      doDecoration(e);
    }
  });

  workspace.onDidChangeTextDocument((e) => {
    if (shouldDecorate(window.activeTextEditor)) {
      doDecoration(window.activeTextEditor);
    }
  });
}

async function doDecoration(editor: TextEditor) {
  console.log('doDecoration');
  const fileName = editor.document.fileName;

  const targetsPropertyPosition = getTargetsPropertyLocation(editor.document);
  console.log('found targets property');
  if (!targetsPropertyPosition) {
    return;
  }

  const targetDecoration = getTargetsDecoration(targetsPropertyPosition);

  editor.setDecorations(targetDecorationType, []);
  editor.setDecorations(targetDecorationType, [targetDecoration]);
}

function getTargetsDecoration(position: Position): DecorationOptions {
  const decorationRange = new Range(position, position);

  const hoverMessage = new MarkdownString(
    '<span style="font-weight: 600;">[$(open-preview) View full project details](command:nx.project-details.openToSide)</span>'
  );
  hoverMessage.supportHtml = true;
  hoverMessage.isTrusted = true;
  hoverMessage.supportThemeIcons = true;

  const contentText = 'Project Details Available';

  return {
    renderOptions: {
      after: {
        contentText,
        color: new ThemeColor('textLink.foreground'),
      },
    },
    range: decorationRange,
    hoverMessage,
  } as DecorationOptions;
}

function shouldDecorate(editor: TextEditor | undefined): editor is TextEditor {
  return (
    (editor?.document.fileName.endsWith('project.json') ||
      editor?.document.fileName.endsWith('package.json')) ??
    false
  );
}

function getInferredTargets(
  document: TextDocument,
  project: ProjectConfiguration
): string[] {
  const json = JSON.parse(document.getText());

  let explicitTargets: string[];
  if (!json.targets) {
    explicitTargets = [];
  } else {
    explicitTargets = Object.keys(json.targets);
  }

  return Object.keys(project.targets ?? {}).filter(
    (targetName) => !explicitTargets.includes(targetName)
  );
}
