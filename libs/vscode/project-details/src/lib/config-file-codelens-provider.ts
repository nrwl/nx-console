import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import {
  getNxWorkspace,
  getProjectByRoot,
  getSourceMapFilesToProjectMap,
  getTargetsForConfigFile,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { relative } from 'path';
import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  ExtensionContext,
  Range,
  TextDocument,
  commands,
  languages,
} from 'vscode';

export class ConfigFileCodelensProvider implements CodeLensProvider {
  constructor(
    public workspaceRoot: string,
    public sourceMapFilesToProjectMap: Record<string, string>
  ) {}

  async provideCodeLenses(
    document: TextDocument,
    token: CancellationToken
  ): Promise<CodeLens[]> {
    const relativePath = relative(this.workspaceRoot, document.fileName);
    if (
      relativePath.endsWith('project.json') ||
      relativePath.endsWith('package.json')
    ) {
      return [];
    }
    const projectRoot = this.sourceMapFilesToProjectMap[relativePath];
    if (!projectRoot) {
      return [];
    }

    return [
      new ConfigFileCodeLens(projectRoot, relativePath, new Range(0, 0, 0, 0)),
    ];
  }
  async resolveCodeLens(
    codeLens: ConfigFileCodeLens,
    token: CancellationToken
  ): Promise<CodeLens> {
    const project = await getProjectByRoot(codeLens.projectRoot);

    const targets = await getTargetsForConfigFile(
      project?.name ?? '',
      codeLens.filePath
    );
    const targetNames = Object.keys(targets ?? {});
    if (targetNames.length === 1) {
      return {
        ...codeLens,
        command: {
          title: `Run ${project?.name}:${targetNames[0]} via nx`,
          command: 'nxConsole.config-codelens.run',
          arguments: [project?.name ?? '', targetNames[0]],
        },
      };
    }

    return {
      ...codeLens,
      command: {
        title: project?.name ?? '',
        command: 'nxConsole.config-codelens.run',
        arguments: [project?.name ?? '', targetNames[0]],
      },
    };
  }

  static async register(context: ExtensionContext) {
    const workspaceRoot = (await getNxWorkspace()).workspacePath;
    const initialSourceMapFilesToProjectMap =
      await getSourceMapFilesToProjectMap();

    const codeLensProvider = new ConfigFileCodelensProvider(
      workspaceRoot,
      initialSourceMapFilesToProjectMap
    );

    onWorkspaceRefreshed(async () => {
      const updatedWorkspaceRoot = (await getNxWorkspace()).workspacePath;
      const updatedSourceMapFilesToProjectMap =
        await getSourceMapFilesToProjectMap();

      codeLensProvider.workspaceRoot = updatedWorkspaceRoot;
      codeLensProvider.sourceMapFilesToProjectMap =
        updatedSourceMapFilesToProjectMap;
    });

    context.subscriptions.push(
      languages.registerCodeLensProvider(
        {
          scheme: 'file',
        },
        codeLensProvider
      ),
      commands.registerCommand(
        'nxConsole.config-codelens.run',
        (project: string, target: string) => {
          CliTaskProvider.instance.executeTask({
            command: 'run',
            positional: `${project}:${target}`,
            flags: [],
          });
        }
      )
    );

    // commands.registerCommand(OPEN_QUICKPICK_COMMAND, (project) => {
    //   showProjectDetailsQuickpick(project);
    // });
  }
}

class ConfigFileCodeLens extends CodeLens {
  constructor(
    public projectRoot: string,
    public filePath: string,
    range: Range
  ) {
    super(range);
  }
}
