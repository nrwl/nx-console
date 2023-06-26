import { Option, OptionType } from '@nx-console/shared/schema';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { verifyBuilderDefinition } from '@nx-console/vscode/verify';
import { window } from 'vscode';
import { selectFlags } from './select-flags';

export async function selectRunInformation(
  projectName?: string,
  targetName?: string,
  configuration?: string,
  askForFlags = true,
  selectTargetFirst = false
): Promise<
  | { projectName: string; targetName: string; flags: string[] | undefined }
  | undefined
> {
  let flags: string[] | undefined;
  if (configuration) {
    flags = [`--configuration=${configuration}`];
  } else if (!askForFlags) {
    flags = [];
  }
  const { validWorkspaceJson, workspace } = await getNxWorkspace();
  if (!validWorkspaceJson) {
    return;
  }

  const projectAndTargetName = selectTargetFirst
    ? await selectTargetAndThenProject(projectName, targetName)
    : await selectProjectAndThenTarget(projectName, targetName);

  if (
    !projectAndTargetName ||
    !projectAndTargetName.projectName ||
    !projectAndTargetName.targetName
  )
    return;

  projectName = projectAndTargetName.projectName;
  targetName = projectAndTargetName.targetName;

  const builderDefinition = await verifyBuilderDefinition(
    projectName,
    targetName,
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
      `run ${projectName}:${surroundWithQuotesIfHasWhiteSpace(targetName)}`,
      options
    );

    return { flags, projectName, targetName: targetName };
  }
  return;
}

async function selectProjectAndThenTarget(
  projectName?: string,
  targetName?: string
): Promise<{ projectName: string; targetName: string } | undefined> {
  if (!projectName) {
    const projects = await getProjects();
    projectName = await selectProject(projects);
    if (!projectName) {
      return;
    }
  }

  if (!targetName) {
    const targets = await getTargets(projectName);
    targetName = (await selectTarget(targets)) as string;
    if (!targetName) {
      return;
    }
  }

  return { projectName, targetName };
}

async function selectTargetAndThenProject(
  projectName?: string,
  targetName?: string
): Promise<{ projectName: string; targetName: string } | undefined> {
  if (!targetName) {
    const targets = await getTargets(projectName);
    targetName = (await selectTarget(targets)) as string;
    if (!targetName) {
      return;
    }
  }

  if (!projectName) {
    const projects = await getProjects(targetName);
    projectName = (await selectProject(projects)) as string;
    if (!projectName) {
      return;
    }
  }

  return { projectName, targetName };
}

async function getTargets(projectName?: string): Promise<string[]> {
  const { workspace } = await getNxWorkspace();

  if (projectName) {
    return Object.keys(workspace.projects[projectName].targets || {});
  }

  return Array.from(
    Object.values(workspace.projects).reduce((acc, project) => {
      for (const target of Object.keys(project.targets ?? {})) {
        acc.add(target);
      }
      return acc;
    }, new Set<string>())
  );
}

async function getProjects(targetName?: string): Promise<string[]> {
  const {
    workspace: { projects },
  } = await getNxWorkspace();
  const projectEntries = Object.entries(projects);

  if (targetName) {
    return projectEntries
      .filter(
        ([, { targets }]) =>
          targets && Object.keys(targets).includes(targetName)
      )
      .map(([project]) => project);
  }
  return projectEntries
    .filter(([, { targets }]) => Boolean(targets))
    .map(([project]) => project);
}

export async function selectProject(projects: string[]) {
  return window.showQuickPick(projects, {
    placeHolder: `Project to run`,
  });
}

async function selectTarget(targets: string[]): Promise<string | undefined> {
  return window.showQuickPick(targets, {
    placeHolder: 'Target to run',
  });
}

function surroundWithQuotesIfHasWhiteSpace(target: string): string {
  if (target.match(/\s/g)) {
    return `"${target}"`;
  }
  return target;
}
