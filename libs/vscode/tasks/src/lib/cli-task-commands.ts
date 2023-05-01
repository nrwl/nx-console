import { commands, ExtensionContext, Uri, window } from 'vscode';

import { GeneratorType, Option, OptionType } from '@nx-console/shared/schema';
import { RunTargetTreeItem } from '@nx-console/vscode/nx-run-target-view';
import {
  getNxVersion,
  getNxWorkspace,
  getProjectByPath,
} from '@nx-console/vscode/nx-workspace';
import { verifyBuilderDefinition } from '@nx-console/vscode/verify';
import { CliTaskProvider } from './cli-task-provider';
import { CliTaskQuickPickItem } from './cli-task-quick-pick-item';
import { selectFlags } from './select-flags';
import { selectGenerator } from './select-generator';
import { selectReMoveGenerator } from './select-re-move-generator';
import { getTelemetry } from '@nx-console/vscode/utils';

export async function registerCliTaskCommands(context: ExtensionContext) {
  commands.registerCommand(
    `nx.run`,
    (
      project?: string,
      target?: string,
      configuration?: string,
      askForFlags?: boolean
    ) => {
      getTelemetry().featureUsed('nx.run', { target });
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
    `nx.run.fileexplorer`,
    async (uri: Uri | undefined) => {
      getTelemetry().featureUsed('nx.run.fileexplorer');
      if (!uri) {
        uri = window.activeTextEditor?.document.uri;
      }

      if (!uri) {
        return;
      }

      selectCliCommandAndPromptForFlags('run', await getCliProjectFromUri(uri));
    }
  );

  /**
   * move and remove were release in patch 8.11
   */
  const version = await getNxVersion();
  if (version.major >= 8) {
    commands.registerCommand(`nx.move`, async (uri: Uri) => {
      getTelemetry().featureUsed('nx.move');
      const generator = await selectReMoveGenerator(uri?.toString(), 'move');
      if (!generator) {
        return;
      }
      showGenerateUi(
        context.extensionPath,
        uri,
        GeneratorType.Other,
        generator
      );
    });

    commands.registerCommand(`nx.remove`, async (uri: Uri) => {
      getTelemetry().featureUsed('nx.remove');
      const generator = await selectReMoveGenerator(uri?.toString(), 'remove');
      if (!generator) {
        return;
      }
      showGenerateUi(
        context.extensionPath,
        uri,
        GeneratorType.Other,
        generator
      );
    });
  }

  commands.registerCommand(`nx.generate`, () => {
    getTelemetry().featureUsed('nx.generate');
    selectGeneratorAndPromptForFlags();
  });

  commands.registerCommand(`nx.generate.ui`, () => {
    getTelemetry().featureUsed('nx.generate.ui');
    showGenerateUi(context.extensionPath);
  });

  commands.registerCommand(`nx.generate.ui.fileexplorer`, (uri: Uri) => {
    getTelemetry().featureUsed('nx.generate.fileexplorer');
    showGenerateUi(context.extensionPath, uri);
  });

  commands.registerCommand(`nx.generate.ui.app`, (uri: Uri) => {
    getTelemetry().featureUsed('nx.generate.ui.app');
    showGenerateUi(context.extensionPath, uri, GeneratorType.Application);
  });
  commands.registerCommand(`nx.generate.ui.lib`, (uri: Uri) => {
    getTelemetry().featureUsed('nx.generate.ui.lib');
    showGenerateUi(context.extensionPath, uri, GeneratorType.Library);
  });
  commands.registerCommand(`nx.generate.ui.app.fileexplorer`, (uri: Uri) => {
    getTelemetry().featureUsed('nx.generate.ui.app.fileexplorer');
    showGenerateUi(context.extensionPath, uri, GeneratorType.Application);
  });
  commands.registerCommand(`nx.generate.ui.lib.fileexplorer`, (uri: Uri) => {
    getTelemetry().featureUsed('nx.generate.ui.lib.fileexplorer');
    showGenerateUi(context.extensionPath, uri, GeneratorType.Library);
  });
  commands.registerCommand(`nx.run.target`, async () => {
    getTelemetry().featureUsed('nx.run.target');
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
}

async function showGenerateUi(
  extensionPath: string,
  uri?: Uri,
  generatorType?: GeneratorType,
  generator?: string
) {
  const { workspacePath, validWorkspaceJson } = await getNxWorkspace();
  if (!workspacePath) {
    window.showErrorMessage(
      'Nx Console requires a workspace be set to perform this action'
    );
    return;
  }
  if (!validWorkspaceJson) {
    window.showErrorMessage('Invalid configuration file');
    return;
  }
  const workspaceTreeItem = new RunTargetTreeItem(
    'generate',
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
  const { validWorkspaceJson, workspace } = await getNxWorkspace();

  if (!projectName) {
    let taskToRun = command;
    if (command === 'run' && target !== undefined) {
      taskToRun = target;
    }
    const selection = validWorkspaceJson
      ? await selectCliProject(taskToRun)
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
    workspace
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
      options
    );
  }

  if (flags !== undefined) {
    CliTaskProvider.instance.executeTask({
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
  const { validWorkspaceJson } = await getNxWorkspace();

  if (!validWorkspaceJson) {
    return;
  }

  const selection = await selectGenerator();
  if (!selection) {
    return;
  }

  const flags = await selectFlags(
    `generate ${selection.positional}`,
    selection.options
  );

  if (flags !== undefined) {
    CliTaskProvider.instance.executeTask({
      positional: selection.positional,
      command: 'generate',
      flags,
    });
  }
}

export async function getCliProjectFromUri(
  uri: Uri
): Promise<string | undefined> {
  const project = await getProjectByPath(uri.fsPath);
  return project?.name;
}

export async function selectCliProject(command: string) {
  const {
    workspace: { projects },
  } = await getNxWorkspace();
  const projectEntries = Object.entries(projects);
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
