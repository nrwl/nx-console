import { debounce } from '@nx-console/shared/utils';
import {
  getNxWorkspacePath,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { join } from 'path';
import {
  DecorationOptions,
  DecorationRangeBehavior,
  MarkdownString,
  Position,
  Range,
  TextEditor,
  ThemeColor,
  window,
  workspace,
} from 'vscode';

const projectDetailsDecorationType = window.createTextEditorDecorationType({
  after: {
    margin: '0 0 0 1rem',
    textDecoration: 'none',
    color: 'red',
  },
  isWholeLine: true,
  rangeBehavior: DecorationRangeBehavior.OpenOpen,
});

export async function decorateWithProjectDetails() {
  const rootPackageJsonPath = join(await getNxWorkspacePath(), 'package.json');
  if (shouldDecorate(window.activeTextEditor, rootPackageJsonPath)) {
    debouncedDecoration(window.activeTextEditor);
  }
  window.onDidChangeActiveTextEditor((e) => {
    if (shouldDecorate(e, rootPackageJsonPath)) {
      debouncedDecoration(e);
    }
  });

  workspace.onDidChangeTextDocument((e) => {
    if (shouldDecorate(window.activeTextEditor, rootPackageJsonPath)) {
      debouncedDecoration(window.activeTextEditor);
    }
  });
}

const debouncedDecoration = debounce(doDecoration, 500);

async function doDecoration(editor: TextEditor) {
  const fileName = editor.document.fileName;
  editor.setDecorations(projectDetailsDecorationType, []);

  editor.setDecorations(projectDetailsDecorationType, [
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

  editor.setDecorations(projectDetailsDecorationType, []);

  editor.setDecorations(projectDetailsDecorationType, [
    projectDetailsWithTargetsDecoration(project.name ?? '', targetsInfo),
  ]);
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
  <h4>Nx Targets in ${projectName}</h4>
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

function shouldDecorate(
  editor: TextEditor | undefined,
  rootPackageJsonPath: string
): editor is TextEditor {
  return (
    ((editor?.document.fileName.endsWith('project.json') ||
      editor?.document.fileName.endsWith('package.json')) &&
      editor.document.fileName !== rootPackageJsonPath) ??
    false
  );
}
