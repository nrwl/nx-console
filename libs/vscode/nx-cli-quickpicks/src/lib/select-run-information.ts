import { Option, OptionType } from '@nx-console/shared/schema';
import { getNxWorkspace } from '@nx-console/vscode/nx-workspace';
import { verifyBuilderDefinition } from '@nx-console/vscode/verify';
import { ThemeIcon, window } from 'vscode';
import { selectFlags } from './select-flags';
import { showNoProjectsMessage } from '@nx-console/vscode/utils';

export async function selectRunInformation(
  projectName?: string,
  targetName?: string,
  configuration?: string,
  askForFlags = true,
  selectTargetFirst = false
): Promise<
  | {
      projectName: string;
      targetName: string;
      configuration?: string;
      flags: string[] | undefined;
    }
  | undefined
> {
  let flags: string[] | undefined;
  if (!askForFlags) {
    flags = [];
  }

  if (projectName && targetName && flags) {
    return { flags, projectName, targetName, configuration };
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
    if (configurations.length && !configuration) {
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
      options,
      configuration
        ? {
            configuration,
          }
        : undefined
    );

    return { flags, projectName, targetName, configuration };
  }
  return;
}

async function selectProjectAndThenTarget(
  projectName?: string,
  targetName?: string
): Promise<{ projectName: string; targetName: string } | undefined> {
  let p = projectName;
  let t = targetName;
  if (!p) {
    const projects = await getProjects(t);
    if (!projects || !projects.length) {
      showNoProjectsMessage();
      return;
    }
    p = await selectProject(projects);
    if (!p) {
      return;
    }
  }

  if (!t) {
    const targets = await getTargets(p);
    t = (await selectTarget(targets)) as string;
    if (!t) {
      return;
    }
  }

  return { projectName: p, targetName: t };
}

async function selectTargetAndThenProject(
  projectName?: string,
  targetName?: string
): Promise<{ projectName: string; targetName: string } | undefined> {
  let p = projectName;
  let t = targetName;
  if (!t) {
    const targets = await getTargets(p);
    if (!targets || !targets.length) {
      showNoProjectsMessage();
      return;
    }
    t = (await selectTarget(targets)) as string;
    if (!t) {
      return;
    }
  }

  if (!p) {
    const projects = await getProjects(t);
    p = (await selectProject(projects)) as string;
    if (!p) {
      return;
    }
  }

  return { projectName: p, targetName: t };
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

export async function selectProject(
  projects: string[],
  highlightedProject?: string
): Promise<string | undefined> {
  const quickPickItems = !highlightedProject
    ? projects.map((p) => ({ label: p }))
    : projects
        .map((p) => ({
          label: p,
          iconPath:
            p === highlightedProject ? new ThemeIcon('star-full') : undefined,
          description: p === highlightedProject ? 'currently open' : undefined,
        }))
        .sort((a, b) => {
          if (a.label === highlightedProject) return -1;
          if (b.label === highlightedProject) return 1;
          return a.label.localeCompare(b.label);
        });
  const selected = await window.showQuickPick(quickPickItems, {
    placeHolder: `Project to run`,
  });
  return selected?.label;
}

export async function selectTarget(
  targets: string[]
): Promise<string | undefined> {
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
