import { CodeLens, CodeLensProvider, Command, Range } from 'vscode';
import { TextDocument } from 'vscode';
import { verifyWorkspace } from './verify-workspace';
import { getProjectLocations } from './find-workspace-json-target';

export class ProjectCodeLens extends CodeLens {
  constructor(
    range: Range,
    public workspaceType: 'nx'|'ng',
    public project: string,
    public target: string,
    public configuration?: string
  ) {
    super(range);
  }
}
export class WorkspaceCodeLensProvider implements CodeLensProvider {

  /**
   * Provides a CodeLens set for a matched document
   * @param document a document matched by the pattern passed to registerCodeLensProvider
   * @returns ProjectCodeLens Range locations and properties for the document
   */
  provideCodeLenses(document: TextDocument): CodeLens[] | undefined {
    const lens: CodeLens[] = [];

    const projectLocations = getProjectLocations(document);
    const { validWorkspaceJson, workspaceType } = verifyWorkspace();
    if (!validWorkspaceJson) {
      return;
    }

    for (const projectName in projectLocations) {
      const project = projectLocations[projectName];
      for (const target in project) {
        const position = document.positionAt(project[target].position);

        lens.push(
          new ProjectCodeLens(
            new Range(position, position),
            workspaceType,
            projectName,
            target
          )
        );
        const configurations = project[target].configurations;
        if (configurations) {
          for (const configuration in configurations) {
            const configurationPosition = document.positionAt(
              configurations[configuration].position
            );

            lens.push(
              new ProjectCodeLens(
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
    return lens;
  }

  /**
   * Resolves and sets the command on visible CodeLens
   * @param lens lens to be resolve
   * @returns ProjectCodeLens with command
   */
  // https://github.com/microsoft/vscode-extension-samples/blob/main/codelens-sample/src/CodelensProvider.ts
  resolveCodeLens(lens: CodeLens): CodeLens | Promise<CodeLens> | null {
    if (lens instanceof ProjectCodeLens) {
      const command: Command = {
        command: 'nx.run',
        title: lens.configuration
          ? `${lens.workspaceType} run ${lens.project}:${lens.target}:${lens.configuration}`
          : `${lens.workspaceType} run ${lens.project}:${lens.target}`,
        arguments: [lens.project, lens.target, lens.configuration],
      };
      lens.command = command;
      return lens;
    }
    return null;
  }
}
