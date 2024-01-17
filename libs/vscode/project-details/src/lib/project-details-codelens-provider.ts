import {
  getProperties,
  getPropertyName,
} from '@nx-console/vscode/nx-config-decoration';
import {
  getNxWorkspace,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { ProjectConfiguration } from 'nx/src/devkit-exports';
import { JsonSourceFile, parseJsonText } from 'typescript';
import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  Event,
  ExtensionContext,
  Position,
  ProviderResult,
  TextDocument,
  languages,
  Range,
  window,
  commands,
  QuickPickItem,
  ThemeIcon,
  QuickPickItemKind,
} from 'vscode';

const OPEN_QUICKPICK_COMMAND = 'nxConsole.project-details.open-quickpick';

export class ProjectDetailsCodelensProvider implements CodeLensProvider {
  constructor(private workspaceRoot: string) {}
  onDidChangeCodeLenses?: Event<void> | undefined;
  provideCodeLenses(
    document: TextDocument,
    token: CancellationToken
  ): ProviderResult<ProjectDetailsCodeLens[]> {
    const codelensLocation = this.getCodelensLocation(document);

    return [
      new ProjectDetailsCodeLens(
        new Range(codelensLocation, codelensLocation),
        document.fileName
      ),
    ];
  }
  async resolveCodeLens?(
    codeLens: ProjectDetailsCodeLens,
    token: CancellationToken
  ): Promise<ProjectDetailsCodeLens | undefined> {
    const project = await getProjectByPath(codeLens.filePath);
    if (!project) {
      return undefined;
    }
    let targetsString = Object.keys(project?.targets ?? {}).join(', ');
    if (targetsString.length > 50) {
      targetsString = targetsString.slice(0, 50 - 3) + '...';
    }

    return {
      ...codeLens,
      command: {
        command: OPEN_QUICKPICK_COMMAND,
        title: `$(play) Nx Targets: ${targetsString}`,
        arguments: [project],
      },
    };
  }

  getCodelensLocation(document: TextDocument): Position {
    const jsonFile = parseJsonText(document.fileName, document.getText());
    const properties = getProperties(jsonFile.statements[0].expression);

    if (document.fileName.endsWith('project.json')) {
      const targetsProperty = properties?.find(
        (prop) => getPropertyName(prop) === 'targets'
      );
      if (targetsProperty) {
        return document.positionAt(targetsProperty.getStart(jsonFile));
      }
      return new Position(1, 1);
    } else {
      const scriptsProperty = properties?.find(
        (prop) => getPropertyName(prop) === 'scripts'
      );
      if (scriptsProperty) {
        return document.positionAt(scriptsProperty.getStart(jsonFile));
      }
      return new Position(1, 1);
    }
  }

  static async register(context: ExtensionContext) {
    const workspaceRoot = (await getNxWorkspace()).workspacePath;
    const codeLensProvider = languages.registerCodeLensProvider(
      { pattern: '**/{package,project}.json' },
      new ProjectDetailsCodelensProvider(workspaceRoot)
    );
    context.subscriptions.push(codeLensProvider);

    commands.registerCommand(OPEN_QUICKPICK_COMMAND, (project) => {
      showProjectDetailsQuickpick(project);
    });
  }
}

function showProjectDetailsQuickpick(project: ProjectConfiguration) {
  const quickPick = window.createQuickPick();
  const targetItems: QuickPickItem[] = Object.entries(
    project.targets ?? {}
  ).map(([name, target]) => ({
    label: name,
    description: target.command ?? target.options?.command ?? target.executor,
    iconPath: new ThemeIcon('play'),
  }));
  const openProjectDetailsItem: QuickPickItem = {
    label: 'Open Project Details',
    iconPath: new ThemeIcon('open-preview'),
  };
  quickPick.items = [
    ...targetItems,
    { label: '', kind: QuickPickItemKind.Separator },
    openProjectDetailsItem,
  ];
  quickPick.canSelectMany = false;
  quickPick.placeholder = `Select action for ${project.name}`;
  quickPick.show();
  quickPick.onDidAccept(() => {
    const selectedItem = quickPick.selectedItems[0];
    if (selectedItem === openProjectDetailsItem) {
      commands.executeCommand('nx.project-details.openToSide');
    } else {
      CliTaskProvider.instance.executeTask({
        command: 'run',
        positional: `${project.name}:${selectedItem.label}`,
        flags: [],
      });
    }
    quickPick.hide();
  });
}

class ProjectDetailsCodeLens extends CodeLens {
  constructor(range: Range, public filePath: string) {
    super(range);
  }
}
