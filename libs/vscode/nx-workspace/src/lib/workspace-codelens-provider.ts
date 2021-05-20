import { CodeLens, CodeLensProvider, Command, Range } from 'vscode';
import { TextDocument } from 'vscode';
import { CliTaskProvider, ProjectDef } from '@nx-console/vscode/tasks';
import { findWorkspaceJsonTarget } from './find-workspace-json-target';

export class WorkspaceCodeLensProvider implements CodeLensProvider {

  constructor(private readonly cliTaskProvider: CliTaskProvider) {}

  async provideCodeLenses(document: TextDocument): Promise<CodeLens[]> {
    return this.cliTaskProvider.getProjectEntries().map(([project, projectDef]: [string, ProjectDef]) => {
      return Object.entries(projectDef.architect || {}).map(([target, targetDef]) => {
        const configurations = Object.keys(targetDef?.configurations || {});
        const command: Command = {
          command: 'nx.run',
          title: `nx run ${project}:${target}`,
          arguments: [project, target],
        };
        const position = document.positionAt(findWorkspaceJsonTarget(document, project, {name: target}));
        return [
          new CodeLens(new Range(position, position), command),
          ...(configurations.map((configuration: string) => {
            const configurationPosition = document.positionAt(findWorkspaceJsonTarget(document, project, {name: target, configuration}));
            const configurationArg = configuration === 'production' ? ' --prod' : ` -c ${configuration}`;
            return new CodeLens(new Range(configurationPosition, configurationPosition), {
              ...command,
              title: command.title + configurationArg,
              arguments: [project, target, configurationArg]
            })
          }))
        ];
      });
    }).flat(2);
  }

}
