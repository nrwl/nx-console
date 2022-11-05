import { commands, ExtensionContext, Uri, window } from 'vscode';

import { WorkspaceJsonConfiguration } from '@nrwl/devkit';
import { getGenerators } from '@nx-console/shared/collections';
import { nxVersion } from '@nx-console/shared/npm';
import { GeneratorType, Option, OptionType } from '@nx-console/shared/schema';
import { RunTargetTreeItem } from '@nx-console/vscode/nx-run-target-view';
import { verifyBuilderDefinition } from '@nx-console/vscode/verify';
import { CliTaskProvider } from './cli-task-provider';
import { CliTaskQuickPickItem } from './cli-task-quick-pick-item';
import { selectFlags } from './select-flags';
import { selectGenerator } from './select-generator';
import { getWorkspacePath, outputLogger } from '@nx-console/vscode/utils';
import {
  findProjectWithPath,
  getNxWorkspace,
} from '@nx-console/vscode/nx-workspace';

const CLI_COMMAND_LIST = [
  'build',
  'deploy',
  'e2e',
  'lint',
  'serve',
  'test',
  'xi18n',
];

let cliTaskProvider: CliTaskProvider;

export function registerCliTaskCommands(
  context: ExtensionContext,
  n: CliTaskProvider
) {
  cliTaskProvider = n;

  CLI_COMMAND_LIST.forEach((command) => {
    context.subscriptions.push(
      commands.registerCommand(`ng.${command}`, () =>
        selectCliCommandAndPromptForFlags(command)
      ),
      commands.registerCommand(`ng.${command}.ui`, () =>
        selectCliCommandAndShowUi(command, context.extensionPath)
      ),
      commands.registerCommand(`nx.${command}`, () =>
        selectCliCommandAndPromptForFlags(command)
      ),
      commands.registerCommand(`nx.${command}.ui`, () =>
        selectCliCommandAndShowUi(command, context.extensionPath)
      )
    );
  });

  ['ng', 'nx'].forEach(async (cli) => {
    commands.registerCommand(
      `${cli}.run`,
      (
        project?: string,
        target?: string,
        configuration?: string,
        askForFlags?: boolean
      ) => {
        selectCliCommandAndPromptForFlags(
          'run',
          project,
          target,
          configuration,
          askForFlags
        );
      }
    );
    commands.registerCommand(
      `${cli}.run.fileexplorer`,
      async (uri: Uri | undefined) => {
        if (!uri) {
          uri = window.activeTextEditor?.document.uri;
        }

        if (!uri) {
          return;
        }

        selectCliCommandAndPromptForFlags(
          'run',
          await getCliProjectFromUri(uri)
        );
      }
    );

    /**
     * move and remove were release in patch 8.11
     */
    const version = await nxVersion(cliTaskProvider.getWorkspacePath());
    if (version.major >= 8) {
      commands.registerCommand(`${cli}.move.fileexplorer`, async (uri: Uri) => {
        /**
         * Bit of a hack - always runs angular/move if it is installed.
         *
         * As of the date of implementation, no issues with running this angular generator
         * on non-angular projects. BUT THIS MIGHT CHANGE IN THE FUTURE.
         *
         * Also, future may hold other framework specific move/remove generators - this
         * solution won't work when that happens.
         */
        const getCorrectMoveGenerator = async () => {
          const workspacePath = cliTaskProvider.getWorkspacePath();
          const generators = await getGenerators(
            workspacePath,
            await cliTaskProvider.getProjects()
          );
          return generators.find(
            (generator) => generator.name === '@nrwl/angular:move'
          )
            ? '@nrwl/angular:move'
            : '@nrwl/workspace:move';
        };
        const generator = await getCorrectMoveGenerator();
        selectCliCommandAndShowUi(
          'generate',
          context.extensionPath,
          uri,
          GeneratorType.Other,
          generator
        );
      });

      commands.registerCommand(
        `${cli}.remove.fileexplorer`,
        async (uri: Uri) => {
          /**
           * Bit of a hack - always runs angular/remove if it is installed.
           *
           * As of the date of implementation, no issues with running this angular generator
           * on non-angular projects. BUT THIS MIGHT CHANGE IN THE FUTURE.
           *
           * Also, future may hold other framework specific move/remove generators - this
           * solution won't work when that happens.
           */
          const getCorrectRemoveGenerator = async () => {
            const workspacePath = cliTaskProvider.getWorkspacePath();
            const generators = await getGenerators(
              workspacePath,
              await cliTaskProvider.getProjects()
            );
            return generators.find(
              (generator) => generator.name === '@nrwl/angular:remove'
            )
              ? '@nrwl/angular:remove'
              : '@nrwl/workspace:remove';
          };
          const generator = await getCorrectRemoveGenerator();
          selectCliCommandAndShowUi(
            'generate',
            context.extensionPath,
            uri,
            GeneratorType.Other,
            generator
          );
        }
      );
    }

    commands.registerCommand(`${cli}.generate`, () =>
      selectGeneratorAndPromptForFlags()
    );

    commands.registerCommand(`${cli}.generate.ui`, () =>
      selectCliCommandAndShowUi('generate', context.extensionPath)
    );

    commands.registerCommand(`${cli}.generate.ui.fileexplorer`, (uri: Uri) =>
      selectCliCommandAndShowUi('generate', context.extensionPath, uri)
    );

    commands.registerCommand(`${cli}.generate.ui.app`, (uri: Uri) => {
      selectCliCommandAndShowUi(
        'generate',
        context.extensionPath,
        uri,
        GeneratorType.Application
      );
    });
    commands.registerCommand(`${cli}.generate.ui.lib`, (uri: Uri) => {
      selectCliCommandAndShowUi(
        'generate',
        context.extensionPath,
        uri,
        GeneratorType.Library
      );
    });
    commands.registerCommand(
      `${cli}.generate.ui.app.fileexplorer`,
      (uri: Uri) => {
        selectCliCommandAndShowUi(
          'generate',
          context.extensionPath,
          uri,
          GeneratorType.Application
        );
      }
    );
    commands.registerCommand(
      `${cli}.generate.ui.lib.fileexplorer`,
      (uri: Uri) => {
        selectCliCommandAndShowUi(
          'generate',
          context.extensionPath,
          uri,
          GeneratorType.Library
        );
      }
    );
    commands.registerCommand(`${cli}.run.target`, async () => {
      const target = await window.showQuickPick(getTargetNames());
      if (!target) {
        return;
      }
      const project = await window.showQuickPick(
        getProjectsWithTargetName(target)
      );
      if (!project) {
        return;
      }
      selectCliCommandAndPromptForFlags('run', project, target);
    });
  });
}

async function selectCliCommandAndShowUi(
  command: string,
  extensionPath: string,
  uri?: Uri,
  generatorType?: GeneratorType,
  generator?: string
) {
  const workspacePath = cliTaskProvider.getWorkspacePath();
  if (!workspacePath) {
    window.showErrorMessage(
      'Nx Console requires a workspace be set to perform this action'
    );
    return;
  }
  const { validWorkspaceJson, configurationFilePath } = await getNxWorkspace();
  if (!validWorkspaceJson) {
    window.showErrorMessage('Invalid configuration file');
    return;
  }
  const workspaceTreeItem = new RunTargetTreeItem(
    configurationFilePath,
    command,
    extensionPath,
    generatorType,
    generator
  );

  commands.executeCommand(
    'nxConsole.revealWebViewPanel',
    workspaceTreeItem,
    uri
  );
}

async function selectCliCommandAndPromptForFlags(
  command: string,
  projectName?: string,
  target?: string,
  configuration?: string,
  askForFlags = true
) {
  let flags: string[] | undefined;
  if (configuration) {
    flags = [`--configuration=${configuration}`];
  } else if (!askForFlags) {
    flags = [];
  }
  const { validWorkspaceJson, workspace, workspaceType } =
    await getNxWorkspace();

  if (!projectName) {
    const selection = validWorkspaceJson
      ? await selectCliProject(command, workspace)
      : undefined;
    if (!selection) {
      return; // Do not execute a command if user clicks out of VSCode UI.
    }
    projectName = selection.projectName;
  }

  const isRunCommand = command === 'run';
  if (!target) {
    if (isRunCommand) {
      target = (await selectCliTarget(
        Object.keys(workspace.projects[projectName].targets || {})
      )) as string;
      if (!target) {
        return;
      }
    } else {
      target = command;
    }
  }

  const builderDefinition = await verifyBuilderDefinition(
    projectName,
    target,
    workspace,
    workspaceType
  );
  const {
    validBuilder,
    options: builderDefinitionOptions,
    configurations,
  } = builderDefinition;
  let options = [...builderDefinitionOptions];
  if (!validBuilder) {
    return;
  }

  if (!flags) {
    if (configurations.length) {
      const configurationsOption: Option = {
        name: 'configuration',
        isRequired: false,
        description: `A named build target as specified in the "configurations" section of your project config.`,
        type: OptionType.String,
        enum: configurations,
        aliases: [],
      };
      options = [configurationsOption, ...options];
    }

    flags = await selectFlags(
      isRunCommand
        ? `${command} ${projectName}:${surroundWithQuotesIfHasWhiteSpace(
            target
          )}`
        : `${command} ${projectName}`,
      options,
      workspaceType
    );
  }

  if (flags !== undefined) {
    cliTaskProvider.executeTask({
      positional: isRunCommand
        ? `${projectName}:${surroundWithQuotesIfHasWhiteSpace(target)}`
        : projectName,
      command,
      flags,
    });
  }
}

function surroundWithQuotesIfHasWhiteSpace(target: string): string {
  if (target.match(/\s/g)) {
    return `"${target}"`;
  }
  return target;
}

async function selectGeneratorAndPromptForFlags() {
  const { validWorkspaceJson, workspaceType, workspacePath } =
    await getNxWorkspace();

  if (!validWorkspaceJson) {
    return;
  }

  const selection = await selectGenerator(workspacePath, workspaceType);
  if (!selection) {
    return;
  }

  const flags = await selectFlags(
    `generate ${selection.positional}`,
    selection.options,
    workspaceType
  );

  if (flags !== undefined) {
    cliTaskProvider.executeTask({
      positional: selection.positional,
      command: 'generate',
      flags,
    });
  }
}

export async function getCliProjectFromUri(
  uri: Uri
): Promise<string | undefined> {
  const project = await findProjectWithPath(uri.fsPath, getWorkspacePath());
  return project?.name;
}

export async function selectCliProject(
  command: string,
  json: WorkspaceJsonConfiguration
) {
  const projectEntries = await cliTaskProvider.getProjectEntries(json);
  const items = projectEntries
    .filter(([, { targets }]) => Boolean(targets))
    .flatMap(([project, { targets, root }]) => ({ project, targets, root }))
    .filter(
      ({ targets }) => Boolean(targets && targets[command]) || command === 'run'
    )
    .map(
      ({ project, targets, root }) =>
        new CliTaskQuickPickItem(
          project,
          root,
          targets![command]!,
          command,
          project
        )
    );

  if (!items.length) {
    window.showInformationMessage(
      `No projects have a target command for ${command}`
    );

    return;
  }

  return window.showQuickPick(items, {
    placeHolder: `Project to ${command}`,
  });
}

async function selectCliTarget(targets: string[]): Promise<string | undefined> {
  return window.showQuickPick(targets, {
    placeHolder: 'Target to run',
  });
}

async function getTargetNames(): Promise<string[]> {
  const { workspace } = await getNxWorkspace();
  const commands = Object.values(workspace.projects).reduce((acc, project) => {
    for (const target of Object.keys(project.targets ?? {})) {
      acc.add(target);
    }
    return acc;
  }, new Set<string>());
  return Array.from(commands);
}

async function getProjectsWithTargetName(
  targetName: string
): Promise<string[]> {
  const { workspace } = await getNxWorkspace();
  const projects = [];
  for (const [projectName, project] of Object.entries(workspace.projects)) {
    const targets = project.targets ?? {};
    if (targets[targetName]) {
      projects.push(projectName);
    }
  }
  return projects;
}
