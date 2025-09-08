import { Option, OptionType } from '@nx-console/shared-schema';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { verifyBuilderDefinition } from '@nx-console/vscode-verify';
import { ThemeIcon, window } from 'vscode';
import { selectFlags } from './select-flags';
import {
  showNoProjectsMessage,
  showNoTargetsMessage,
  createProjectTargetString,
} from '@nx-console/vscode-utils';

export async function selectRunInformation(
  projectName?: string,
  targetName?: string,
  configuration?: string,
  askForFlags = true,
  selectTargetFirst = false,
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

  const nxWorkspace = await getNxWorkspace();
  if (!nxWorkspace) {
    return;
  }
  const { validWorkspaceJson, projectGraph } = nxWorkspace;
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
    projectGraph,
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
      `run ${createProjectTargetString(projectName, targetName)}`,
      options,
      configuration
        ? {
            configuration,
          }
        : undefined,
    );

    return { flags, projectName, targetName, configuration };
  }
  return;
}

async function selectProjectAndThenTarget(
  projectName?: string,
  targetName?: string,
): Promise<{ projectName: string; targetName: string } | undefined> {
  let p = projectName;
  let t = targetName;
  if (!p) {
    const projects = await getProjects(t);
    if (!projects || !projects.length) {
      showNoProjectsMessage(!!projects);
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
  targetName?: string,
): Promise<{ projectName: string; targetName: string } | undefined> {
  let p = projectName;
  let t = targetName;
  if (!t) {
    const targets = await getTargets(p);
    if (!targets || !targets.length) {
      const nxWorkspace = await getNxWorkspace();
      if (
        !nxWorkspace ||
        Object.keys(nxWorkspace.projectGraph.nodes).length === 0
      ) {
        showNoProjectsMessage(!!nxWorkspace);
      } else {
        showNoTargetsMessage(!!nxWorkspace);
      }
      return;
    }
    t = (await selectTarget(targets)) as string;
    if (!t) {
      return;
    }
  }

  if (!p) {
    const projects = await getProjects(t);
    if (!projects || !projects.length) {
      showNoProjectsMessage(!!projects);
      return;
    }
    p = (await selectProject(projects)) as string;
    if (!p) {
      return;
    }
  }

  return { projectName: p, targetName: t };
}

async function getTargets(projectName?: string): Promise<string[]> {
  const nxWorkspace = await getNxWorkspace();
  if (!nxWorkspace) {
    return [];
  }
  const { projectGraph } = nxWorkspace;

  if (projectName) {
    return Object.keys(
      projectGraph.nodes[projectName].data.targets || {},
    ).sort();
  }

  return Array.from(
    Object.values(projectGraph.nodes ?? {}).reduce((acc, project) => {
      for (const target of Object.keys(project.data.targets ?? {})) {
        acc.add(target);
      }
      return acc;
    }, new Set<string>()),
  ).sort();
}

async function getProjects(targetName?: string): Promise<string[] | undefined> {
  const nxWorkspace = await getNxWorkspace();
  if (!nxWorkspace) {
    return undefined;
  }
  const { projectGraph } = nxWorkspace;
  const projectEntries = Object.entries(projectGraph.nodes);

  if (targetName) {
    return projectEntries
      .filter(
        ([
          ,
          {
            data: { targets },
          },
        ]) => targets && Object.keys(targets).includes(targetName),
      )
      .map(([project]) => project);
  }
  return projectEntries
    .filter(
      ([
        ,
        {
          data: { targets },
        },
      ]) => Boolean(targets),
    )
    .map(([project]) => project);
}

export async function selectProject(
  projects: string[],
  options?: {
    highlightedProject?: string;
    placeholderText?: string;
  },
): Promise<string | undefined> {
  const quickPickItems = !options?.highlightedProject
    ? projects.map((p) => ({ label: p }))
    : projects
        .map((p) => ({
          label: p,
          iconPath:
            p === options?.highlightedProject
              ? new ThemeIcon('star-full')
              : undefined,
          description:
            p === options?.highlightedProject ? 'currently open' : undefined,
        }))
        .sort((a, b) => {
          if (a.label === options?.highlightedProject) return -1;
          if (b.label === options?.highlightedProject) return 1;
          return a.label.localeCompare(b.label);
        });
  const selected = await window.showQuickPick(quickPickItems, {
    placeHolder: options?.placeholderText ?? `Project to run`,
  });
  return selected?.label;
}

export async function selectTarget(
  targets: string[],
): Promise<string | undefined> {
  return window.showQuickPick(targets, {
    placeHolder: 'Target to run',
  });
}
