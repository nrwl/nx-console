import {
  CodeLens,
  CodeLensProvider,
  Command,
  ConfigurationChangeEvent,
  Disposable,
  ExtensionContext,
  languages,
  Range,
  Uri,
  workspace,
} from 'vscode';
import { TextDocument } from 'vscode';
import { verifyWorkspace } from './verify-workspace';
import {
  getProjectLocations,
  ProjectLocations,
} from './find-workspace-json-target';
import {
  GlobalConfigurationStore,
  WorkspaceConfigurationStore,
} from '@nx-console/vscode/configuration';
import { buildProjectPath } from '@nx-console/server';

export class TargetCodeLens extends CodeLens {
  constructor(
    range: Range,
    public workspaceType: 'nx' | 'ng',
    public project: string,
    public target: string,
    public configuration?: string
  ) {
    super(range);
  }
}

export class ProjectCodeLens extends CodeLens {
  constructor(
    range: Range,
    public project: string,
    public projectPath: string
  ) {
    super(range);
  }
}

export class WorkspaceCodeLensProvider implements CodeLensProvider {
  /**
   * CodeLensProvider is disposed and re-registered on setting changes
   */
  codeLensProvider: Disposable | null;

  /**
   * The WorkspaceCodeLensProvider adds clickable nx run targets in the workspace config file.
   * It is enabled by default and can be disabled with the `enableWorkspaceConfigCodeLens` setting.
   * @param context instance of ExtensionContext from activate
   */
  constructor(private readonly context: ExtensionContext) {
    this.registerWorkspaceCodeLensProvider(context);
    this.watchWorkspaceCodeLensConfigChange(context);
  }

  /**
   * Provides a CodeLens set for a matched document
   * @param document a document matched by the pattern passed to registerCodeLensProvider
   * @returns ProjectCodeLens Range locations and properties for the document
   */
  async provideCodeLenses(
    document: TextDocument
  ): Promise<CodeLens[] | undefined> {
    const lens: CodeLens[] = [];

    let projectName = '';
    const { json } = await verifyWorkspace();

    if (document.uri.path.endsWith('project.json')) {
      for (const [key, project] of Object.entries(json.projects)) {
        if (
          document.uri.path
            .replace(/\\/g, '/')
            .endsWith(`${project.root}/project.json`)
        ) {
          projectName = key;
          break;
        }
      }
    }

    const projectLocations = getProjectLocations(document, projectName);
    const { validWorkspaceJson, workspaceType } = await verifyWorkspace();
    if (!validWorkspaceJson) {
      return;
    }

    for (const projectName in projectLocations) {
      const project = projectLocations[projectName];

      this.buildProjectLenses(
        project,
        document,
        lens,
        projectName,
        WorkspaceConfigurationStore.instance.get('nxWorkspacePath', '')
      );

      this.buildTargetLenses(
        project,
        document,
        lens,
        workspaceType,
        projectName
      );
    }
    return lens;
  }
  buildProjectLenses(
    project: ProjectLocations[string],
    document: TextDocument,
    lens: CodeLens[],
    projectName: string,
    workspacePath: string
  ) {
    if (!project.projectPath) {
      return;
    }
    const position = document.positionAt(project.position);
    lens.push(
      new ProjectCodeLens(
        new Range(position, position),
        projectName,
        buildProjectPath(workspacePath, project.projectPath)
      )
    );
  }

  private buildTargetLenses(
    project: ProjectLocations[string],
    document: TextDocument,
    lens: CodeLens[],
    workspaceType: 'nx' | 'ng',
    projectName: string
  ) {
    const projectTargets = project.targets;
    for (const target in projectTargets) {
      const position = document.positionAt(projectTargets[target].position);

      lens.push(
        new TargetCodeLens(
          new Range(position, position),
          workspaceType,
          projectName,
          target
        )
      );
      const configurations = projectTargets[target].configurations;
      if (configurations) {
        for (const configuration in configurations) {
          const configurationPosition = document.positionAt(
            configurations[configuration].position
          );

          lens.push(
            new TargetCodeLens(
              new Range(configurationPosition, configurationPosition),
              workspaceType,
              projectName,
              target,
              configuration
            )
          );
        }
      }
    }
  }

  /**
   * Resolves and sets the command on visible CodeLens
   * @param lens lens to be resolve
   * @returns ProjectCodeLens with command
   */
  // https://github.com/microsoft/vscode-extension-samples/blob/main/codelens-sample/src/CodelensProvider.ts
  resolveCodeLens(lens: CodeLens): CodeLens | Promise<CodeLens> | null {
    if (lens instanceof TargetCodeLens) {
      const command: Command = {
        command: `${lens.workspaceType}.run`,
        title: lens.configuration
          ? `${lens.workspaceType} run ${lens.project}:${lens.target}:${lens.configuration}`
          : `${lens.workspaceType} run ${lens.project}:${lens.target}`,
        arguments: [lens.project, lens.target, lens.configuration],
      };
      lens.command = command;
      return lens;
    }

    if (lens instanceof ProjectCodeLens) {
      const command: Command = {
        command: `vscode.open`,
        title: `Go to "${lens.project}" configuration`,
        arguments: [Uri.file(lens.projectPath)],
      };
      lens.command = command;
      return lens;
    }

    return null;
  }

  /**
   * Checks the enableWorkspaceConfigCodeLens setting and registers this as a CodeLensProvider.
   * @param context instance of ExtensionContext from activate
   */
  registerWorkspaceCodeLensProvider(context: ExtensionContext) {
    const enableWorkspaceConfigCodeLens = GlobalConfigurationStore.instance.get(
      'enableWorkspaceConfigCodeLens'
    );
    if (enableWorkspaceConfigCodeLens) {
      this.codeLensProvider = languages.registerCodeLensProvider(
        { pattern: '**/{workspace,angular,project}.json' },
        this
      );
      context.subscriptions.push(this.codeLensProvider);
    }
  }

  /**
   * Watches for settings/configuration changes and enables/disables the CodeLensProvider
   * @param context instance of ExtensionContext from activate
   */
  watchWorkspaceCodeLensConfigChange(context: ExtensionContext) {
    context.subscriptions.push(
      workspace.onDidChangeConfiguration((event: ConfigurationChangeEvent) => {
        // if the `nxConsole` config changes, check enableWorkspaceConfigCodeLens and register or dispose
        const affectsNxConsoleConfig = event.affectsConfiguration(
          GlobalConfigurationStore.configurationSection
        );
        if (affectsNxConsoleConfig) {
          const enableWorkspaceConfigCodeLens =
            GlobalConfigurationStore.instance.get(
              'enableWorkspaceConfigCodeLens'
            );
          if (enableWorkspaceConfigCodeLens && !this.codeLensProvider) {
            this.registerWorkspaceCodeLensProvider(this.context);
          } else if (!enableWorkspaceConfigCodeLens && this.codeLensProvider) {
            this.codeLensProvider.dispose();
            this.codeLensProvider = null;
          }
        }
      })
    );
  }
}
