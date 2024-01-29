import { onWorkspaceRefreshed } from '@nx-console/vscode/lsp-client';
import { getProperties } from '@nx-console/vscode/nx-config-decoration';
import {
  getNxWorkspace,
  getProjectByRoot,
  getSourceMapFilesToProjectMap,
  getTargetsForConfigFile,
} from '@nx-console/vscode/nx-workspace';
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { relative } from 'path';
import {
  ModifierFlags,
  ScriptTarget,
  createSourceFile,
  getCombinedModifierFlags,
  isExportAssignment,
  isExportDeclaration,
  isImportDeclaration,
  parseJsonText,
  Node,
} from 'typescript';
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

    const location = this.getCodeLensLocation(document);

    return [
      new RunTargetCodeLens(projectRoot, relativePath, location),
      new OpenPDVCodeLens(document, projectRoot, relativePath, location),
    ];
  }

  private getCodeLensLocation(document: TextDocument): Range {
    try {
      if (['typescript', 'javascript'].includes(document.languageId)) {
        const configFile = createSourceFile(
          document.fileName,
          document.getText(),
          {
            languageVersion: ScriptTarget.Latest,
          }
        );
        let firstNonImportNode: Node | undefined = undefined;

        for (const node of configFile.statements) {
          if (isExportDeclaration(node) || isExportAssignment(node)) {
            const pos = document.positionAt(node.getStart(configFile));
            return new Range(pos, pos);
          }

          if (!firstNonImportNode && !isImportDeclaration(node)) {
            firstNonImportNode = node;
          }
        }

        if (firstNonImportNode) {
          const pos = document.positionAt(
            firstNonImportNode.getStart(configFile)
          );
          return new Range(pos, pos);
        }
      }
      return new Range(0, 0, 0, 0);
    } catch (e) {
      return new Range(0, 0, 0, 0);
    }
  }

  async resolveCodeLens(
    codeLens: RunTargetCodeLens | OpenPDVCodeLens,
    token: CancellationToken
  ): Promise<CodeLens> {
    if (OpenPDVCodeLens.is(codeLens)) {
      return await this.resolveOpenPDVCodeLens(codeLens);
    } else {
      return await this.resolveRunTargetCodeLens(codeLens);
    }
  }

  private async resolveRunTargetCodeLens(
    codeLens: RunTargetCodeLens
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
          title: `$(play) Run ${project?.name}:${targetNames[0]} via nx`,
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

  private async resolveOpenPDVCodeLens(
    codeLens: OpenPDVCodeLens
  ): Promise<CodeLens> {
    const project = await getProjectByRoot(codeLens.projectRoot);

    const targets = await getTargetsForConfigFile(
      project?.name ?? '',
      codeLens.filePath
    );
    const targetNames = Object.keys(targets ?? {});
    return {
      ...codeLens,
      command: {
        title: `$(open-preview) Open Project Details View`,
        command: 'nx.project-details.openToSide',
        arguments: [
          {
            document: codeLens.document,
            expandTarget: targetNames[0],
          },
        ],
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

class RunTargetCodeLens extends CodeLens {
  constructor(
    public projectRoot: string,
    public filePath: string,
    range: Range
  ) {
    super(range);
  }
}

class OpenPDVCodeLens extends CodeLens {
  constructor(
    public document: TextDocument,
    public projectRoot: string,
    public filePath: string,
    range: Range
  ) {
    super(range);
  }

  static is(codeLens: CodeLens): codeLens is OpenPDVCodeLens {
    return (
      (codeLens as any).projectRoot &&
      (codeLens as any).filePath &&
      (codeLens as any).document
    );
  }
}
