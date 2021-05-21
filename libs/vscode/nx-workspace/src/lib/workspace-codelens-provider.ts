import { CodeLens, CodeLensProvider, Command, Range } from 'vscode';
import { CancellationToken, TextDocument } from 'vscode';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { CliTaskProvider } from '@nx-console/vscode/tasks';
import { getProjectLocations } from './find-workspace-json-target';

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

    const projectLocations = getProjectLocations(document);

    for (const projectName in projectLocations) {
      const project = projectLocations[projectName];
      for (const target in project) {
        const position = document.positionAt(project[target].position);

        lens.push(
          new ProjectCodeLens(
            new Range(position, position),
            projectName,
            target
          )
        );
        const configurations = project[target].configurations;
        if (configurations) {
          for (const configuration in configurations) {
            const configTarget = configurations[configuration];
            const configurationPosition = document.positionAt(
              configTarget.position
            );

            lens.push(
              new ProjectCodeLens(
                new Range(configurationPosition, configurationPosition),
                projectName,
                target,
                configuration
              )
            );
          }
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
