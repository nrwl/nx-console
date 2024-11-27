import { getNxWorkspacePath } from '@nx-console/vscode/configuration';
import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import {
  getProperties,
  getPropertyName,
} from '@nx-console/vscode/nx-config-decoration';
import {
  getNxWorkspace,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getTelemetry } from '@nx-console/vscode/telemetry';
import {
  NxCodeLensProvider,
  registerCodeLensProvider,
} from '@nx-console/vscode/utils';
import type { ProjectConfiguration } from 'nx/src/devkit-exports';
import { parseJsonText } from 'typescript';
import {
  CancellationToken,
  CodeLens,
  Event,
  ExtensionContext,
  Position,
  ProviderResult,
  TextDocument,
  Range,
  window,
  commands,
  QuickPickItem,
  ThemeIcon,
  QuickPickItemKind,
  EventEmitter,
} from 'vscode';

const OPEN_QUICKPICK_COMMAND = 'nxConsole.project-details.open-quickpick';

export class ProjectDetailsCodelensProvider implements NxCodeLensProvider {
  CODELENS_PATTERN = { pattern: '**/{package,project}.json' };

  constructor(private workspaceRoot: string) {}

  private changeEvent = new EventEmitter<void>();

  public get onDidChangeCodeLenses(): Event<void> {
    return this.changeEvent.event;
  }

  public refresh(): void {
    this.changeEvent.fire();
  }

  provideCodeLenses(
    document: TextDocument,
    token: CancellationToken
  ): ProviderResult<(NxTargetsCodelens | ViewProjectDetailsCodelens)[]> {
    try {
      const codelenses = [];
      const codelensLocation = this.getCodelensLocation(document);
      if (document.fileName.endsWith('project.json')) {
        codelenses.push(
          new ViewProjectDetailsCodelens(
            new Range(codelensLocation, codelensLocation),
            document.fileName
          )
        );
      }
      codelenses.push(
        new NxTargetsCodelens(
          new Range(codelensLocation, codelensLocation),
          document.fileName
        )
      );
      return codelenses;
    } catch (e) {
      return [];
    }
  }
  async resolveCodeLens?(
    codeLens: NxTargetsCodelens | ViewProjectDetailsCodelens,
    token: CancellationToken
  ): Promise<NxTargetsCodelens | ViewProjectDetailsCodelens | undefined> {
    const project = await getProjectByPath(codeLens.filePath);
    const nxWorkspace = await getNxWorkspace();
    const errors = nxWorkspace?.errors;
    const isPartial = nxWorkspace?.isPartial;
    const hasProjects =
      Object.keys(nxWorkspace?.workspace.projects ?? {}).length > 0;

    const projectGraphFailed =
      errors && errors.length > 0 && (!isPartial || !hasProjects);
    if (isNxTargetsCodelens(codeLens)) {
      if (!project) {
        if (projectGraphFailed) {
          return {
            ...codeLens,
            command: {
              command: 'nx.project-details.openToSide',
              title: `Project graph computation failed. Click to see Details.`,
            },
          };
        } else {
          return {
            ...codeLens,
            command: {
              command: 'nx.run.target',
              title: `$(play) Run Nx Targets`,
            },
          };
        }
      }

      let targetsString = Object.keys(project?.targets ?? {}).join(', ');
      if (targetsString.length > 50) {
        targetsString = targetsString.slice(0, 50 - 3) + '...';
      }

      return {
        ...codeLens,
        command: {
          command: targetsString
            ? OPEN_QUICKPICK_COMMAND
            : 'nx.project-details.openToSide',
          title: targetsString
            ? `$(play) Nx Targets: ${targetsString}`
            : '$(open-preview) Open Project Details View',
          arguments: [project],
        },
      };
    } else {
      if (!project && projectGraphFailed) {
        return {
          ...codeLens,
          command: {
            command: 'nx.project-details.openToSide',
            title: `$(error)`,
          },
        };
      }
      return {
        ...codeLens,
        command: {
          command: 'nx.project-details.openToSide',
          title: `$(open-preview) View Project Details`,
        },
      };
    }
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
    const workspaceRoot = getNxWorkspacePath();
    const codeLensProvider = new ProjectDetailsCodelensProvider(workspaceRoot);

    registerCodeLensProvider(codeLensProvider);

    context.subscriptions.push(
      commands.registerCommand(OPEN_QUICKPICK_COMMAND, (project) => {
        showProjectDetailsQuickpick(project);
      }),
      onWorkspaceRefreshed(() => codeLensProvider.refresh())
    );
  }
}

function showProjectDetailsQuickpick(project: ProjectConfiguration) {
  getTelemetry().logUsage('misc.open-project-details-codelens');
  const quickPick = window.createQuickPick();
  const targetItems: QuickPickItem[] = Object.entries(
    project.targets ?? {}
  ).map(([name, target]) => ({
    label: name,
    description: target.command ?? target.options?.command ?? target.executor,
    iconPath: new ThemeIcon('play'),
  }));

  const openProjectDetailsItem: QuickPickItem = {
    label: 'View Project Details',
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

class NxTargetsCodelens extends CodeLens {
  type = 'nx-targets-codelens' as const;
  constructor(range: Range, public filePath: string) {
    super(range);
  }
}

class ViewProjectDetailsCodelens extends CodeLens {
  type = 'view-project-details-codelens' as const;
  constructor(range: Range, public filePath: string) {
    super(range);
  }
}

function isNxTargetsCodelens(
  codelens: NxTargetsCodelens | ViewProjectDetailsCodelens
): codelens is NxTargetsCodelens {
  return codelens.type === 'nx-targets-codelens';
}
