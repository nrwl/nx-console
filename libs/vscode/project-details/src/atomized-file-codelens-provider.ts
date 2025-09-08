import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import {
  NxCodeLensProvider,
  registerCodeLensProvider,
  createProjectTargetString,
} from '@nx-console/vscode-utils';
import { onWorkspaceRefreshed } from '@nx-console/vscode-lsp-client';
import { join } from 'path';
import {
  CallExpression,
  createSourceFile,
  ExpressionStatement,
  Identifier,
  isImportDeclaration,
  Node,
  ScriptTarget,
  SyntaxKind,
} from 'typescript';
import {
  CancellationToken,
  CodeLens,
  Event,
  EventEmitter,
  ExtensionContext,
  ProviderResult,
  Range,
  TextDocument,
} from 'vscode';
import { CODELENS_RUN_TARGET_COMMAND } from './config-file-codelens-provider';

export class AtomizedFileCodelensProvider implements NxCodeLensProvider {
  constructor(
    public workspaceRoot: string,
    public sourceFilesToAtomizedTargetsMap: Record<
      string,
      [project: string, target: string]
    >
  ) {}
  CODELENS_PATTERN = {
    scheme: 'file',
  };
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
  ): ProviderResult<CodeLens[]> {
    const path = document.uri.fsPath;
    if (!this.sourceFilesToAtomizedTargetsMap[path]) {
      return [];
    }
    const [project, target] = this.sourceFilesToAtomizedTargetsMap[path];
    if (project && target) {
      const location = this.getCodeLensLocation(document);
      return [
        new CodeLens(location, {
          title: `$(play) Run ${createProjectTargetString(project, target)} via nx`,
          command: CODELENS_RUN_TARGET_COMMAND,
          arguments: [project, target],
        }),
      ];
    }
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
          if (node.kind === SyntaxKind.ExpressionStatement) {
            const expr = (node as ExpressionStatement).expression;
            if (expr.kind === SyntaxKind.CallExpression) {
              const call = expr as CallExpression;
              if (
                call.expression.kind === SyntaxKind.Identifier &&
                (call.expression as Identifier).text === 'describe'
              ) {
                const pos = document.positionAt(node.getStart(configFile));
                return new Range(pos, pos);
              }
            }
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

  static async register(context: ExtensionContext) {
    const workspacePath = getNxWorkspacePath();
    const sourceFilesToAtomizedTargetsMap =
      await getSourceFilesToAtomizedTargetsMap(workspacePath);

    const provider = new AtomizedFileCodelensProvider(
      workspacePath,
      sourceFilesToAtomizedTargetsMap
    );

    context.subscriptions.push(
      onWorkspaceRefreshed(async () => {
        const updatedWorkspacePath = getNxWorkspacePath();
        const updatedSourceFilesToAtomizedTargetsMap =
          await getSourceFilesToAtomizedTargetsMap(updatedWorkspacePath);

        provider.workspaceRoot = updatedWorkspacePath;
        provider.sourceFilesToAtomizedTargetsMap =
          updatedSourceFilesToAtomizedTargetsMap;

        provider.refresh();
      })
    );

    registerCodeLensProvider(provider);
  }
}

export async function getSourceFilesToAtomizedTargetsMap(
  workspacePath: string
): Promise<Record<string, [project: string, target: string]>> {
  const sourceFilesToAtomizedTargetsMap: Record<
    string,
    [project: string, target: string]
  > = {};
  const nxWorkspace = await getNxWorkspace();
  if (!nxWorkspace) {
    return {};
  }
  const { projectGraph } = nxWorkspace;

  for (const projectNode of Object.values(projectGraph.nodes)) {
    const targetGroups = projectNode.data.metadata?.targetGroups;
    if (!targetGroups) {
      continue;
    }
    for (const targetGroup of Object.values(targetGroups)) {
      const atomizerRootTarget = targetGroup.find(
        (target) =>
          projectNode.data.targets?.[target]?.metadata?.nonAtomizedTarget
      );
      if (!atomizerRootTarget) {
        continue;
      }
      for (const target of targetGroup) {
        if (target === atomizerRootTarget) {
          continue;
        }
        const fileName = join(
          workspacePath,
          projectNode.data.root,
          target.replace(`${atomizerRootTarget}--`, '')
        );
        sourceFilesToAtomizedTargetsMap[fileName] = [projectNode.name, target];
      }
    }
  }
  return sourceFilesToAtomizedTargetsMap;
}
