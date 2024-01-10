import { debounce } from '@nx-console/shared/utils';
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
    color: 'red',
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

const projectDetailsLoadingDecoration = () => {
  const hoverLoading = new MarkdownString();
  hoverLoading.supportThemeIcons = true;
  hoverLoading.supportHtml = true;
  hoverLoading.value = `
  <h4>Loading project details preview... $(loading~spin)</h4>
  `;

  return {
    renderOptions: {
      after: {
        contentText: `Nx Project Details`,
        color: new ThemeColor('textLink.foreground'),
      },
    },
    range: new Range(new Position(0, 1), new Position(0, 1)),
    hoverMessage: [hoverLoading, getHoverLink()],
  } as DecorationOptions;
};

const projectDetailsWithTargetsDecoration = (
  projectName: string,
  targets: { name: string; command: string }[]
) => {
  const contentText = `Nx Project Details (${targets.length} targets found)`;
  const hoverTargets = new MarkdownString();
  hoverTargets.supportHtml = true;
  hoverTargets.supportThemeIcons = true;
  hoverTargets.isTrusted = true;
  hoverTargets.value = `
  <h4>Targets in ${projectName}</h4>
  `;
  hoverTargets.appendMarkdown(`
  | Target | Command |
| :----------- | :------------- |
${targets.map(({ name, command }) => `| **${name}** | ${command} |`).join('\n')}
  `);

  return {
    renderOptions: {
      after: {
        contentText,
        color: new ThemeColor('textLink.foreground'),
      },
    },
    range: new Range(new Position(0, 1), new Position(0, 1)),
    hoverMessage: [hoverTargets, getHoverLink()],
  } as DecorationOptions;
};

const getHoverLink = () => {
  const hoverLink = new MarkdownString();
  hoverLink.isTrusted = true;
  hoverLink.supportThemeIcons = true;
  hoverLink.value = `
  <span style="font-weight: 600;">[$(open-preview) View full project details](command:nx.project-details.openToSide)</span>
  `;
  return hoverLink;
};

const debouncedDecoration = debounce(doDecoration, 500);

async function doDecoration(editor: TextEditor) {
  console.log('doDecoration');
  const fileName = editor.document.fileName;
  editor.setDecorations(targetDecorationType, []);

  const target = getTargetsPropertyLocation(editor.document);
  console.log(target);

  editor.setDecorations(targetDecorationType, [
    projectDetailsLoadingDecoration(),
  ]);

  const project = await getProjectByPath(fileName);

  if (!project) {
    return;
  }

  const targetsInfo = Object.entries(project.targets ?? {}).map(
    ([name, target]) => ({
      name,
      command: target.command ?? target.options?.command ?? target.executor,
    })
  );

  editor.setDecorations(targetDecorationType, []);

  editor.setDecorations(targetDecorationType, [
    projectDetailsWithTargetsDecoration(project.name ?? '', targetsInfo),
  ]);
}

function getTargetsDecoration(
  position: Position,
  inferredTargets?: string[]
): DecorationOptions {
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
