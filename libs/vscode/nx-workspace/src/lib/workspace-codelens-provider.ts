import { CodeLens, CodeLensProvider, Command, Range } from 'vscode';
import { CancellationToken, TextDocument } from 'vscode';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { findWorkspaceJsonTargetAsync } from './find-workspace-json-target';

export class ProjectCodeLens extends CodeLens {
  constructor(
    range: Range,
    public project: string,
    public target: string,
    public configuration?: string
  ) {
    super(range);
  }
}
export class WorkspaceCodeLensProvider implements CodeLensProvider {
  constructor(private readonly cliTaskProvider: CliTaskProvider) {}

  async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
    const lens: CodeLens[] = [];

    for (const [
      project,
      projectDef,
    ] of this.cliTaskProvider.getProjectEntries()) {
      const architect = projectDef.architect || {};
      for (const target in architect) {
        const targetDef = architect[target];
        const configurations = Object.keys(targetDef?.configurations || {});
        const position = document.positionAt(
          await findWorkspaceJsonTargetAsync(document, project, {
            name: target,
          })
        );

        lens.push(
          new ProjectCodeLens(new Range(position, position), project, target)
        );

        // configurations
        for (const configuration of configurations) {
          const configurationPosition = document.positionAt(
            await findWorkspaceJsonTargetAsync(document, project, {
              name: target,
              configuration,
            })
          );
          lens.push(
            new ProjectCodeLens(
              new Range(configurationPosition, configurationPosition),
              project,
              target,
              configuration
            )
          );
        }
      }
    }
    return lens;
  }

  // TODO: https://code.visualstudio.com/api/references/vscode-api#CodeLensProvider.resolveCodeLens
  // provideCodeLenses should return as fast as possible and if computing the commands is expensive
  //  implementors should only return code lens objects with the range set and implement resolve.
  // https://github.com/microsoft/vscode-extension-samples/blob/main/codelens-sample/src/CodelensProvider.ts
  resolveCodeLens(
    lens: CodeLens,
    token: CancellationToken
  ): CodeLens | Promise<CodeLens> | null {
    if (lens instanceof ProjectCodeLens) {
      const command: Command = {
        command: 'nx.run',
        title: lens.configuration
          ? `nx run ${lens.project}:${lens.target} -c ${lens.configuration}`
          : `nx run ${lens.project}:${lens.target}`,
        arguments: [lens.project, lens.target, lens.configuration],
      };
      lens.command = command;
      return lens;
    }
    return null;
  }
}
