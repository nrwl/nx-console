import { debounce } from '@nx-console/shared/utils';
import { GlobalConfigurationStore } from '@nx-console/vscode/configuration';
import {
  getNxWorkspacePath,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { join } from 'path';
import {
  DecorationOptions,
  DecorationRangeBehavior,
  MarkdownString,
  Position,
  Range,
  TextEditor,
  ThemeColor,
  commands,
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
  const isEnabled = GlobalConfigurationStore.instance.get(
    'showProjectDetailsView'
  );
  if (!isEnabled) return;

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
  let targetsText = targets.map(({ name }) => name).join(', ');
  if (targetsText.length > 50) {
    targetsText = targetsText.slice(0, 50 - 3) + '...';
  }

  const contentText = `Nx Targets: ${targetsText}`;
  const hoverTargets = new MarkdownString();
  hoverTargets.supportHtml = true;
  hoverTargets.supportThemeIcons = true;
  hoverTargets.isTrusted = true;
  hoverTargets.appendMarkdown(`
  ####  Nx Targets in ${projectName}
  |  |  | |
| :----------- | :------------- | :------------- |
${targets
  .map(
    ({ name, command }) =>
      `| **${name}**: | ${command} | [$(play)](command:nx-console.temp.project-details-decoration.run.${projectName}.${name}) |`
  )
  .join('\n')}
  `);
  registerInteractivityCommands(
    projectName,
    targets.map(({ name }) => name)
  );

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

const registerInteractivityCommands = (
  projectName: string,
  targets: string[]
) => {
  commands.getCommands(true).then((cmds) => {
    const registeredCommands = cmds.filter((c) =>
      c.startsWith(
        `nx-console.temp.project-details-decoration.run.${projectName}`
      )
    );
    targets.forEach((name) => {
      if (
        registeredCommands.includes(
          `nx-console.temp.project-details-decoration.run.${projectName}.${name}`
        )
      ) {
        return;
      }
      commands.registerCommand(
        `nx-console.temp.project-details-decoration.run.${projectName}.${name}`,
        () => {
          const target = `${projectName}:${name}`;
          CliTaskProvider.instance.executeTask({
            positional: target,
            command: 'run',
            flags: [],
          });
        }
      );
    });
  });
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
