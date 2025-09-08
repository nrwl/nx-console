import type { NxError } from '@nx-console/shared-types';
import { getMessageForError } from '@nx-console/shared-utils';
import type { ProjectGraph } from 'nx/src/devkit-exports';
import { NX_PROJECT_DETAILS } from './tool-names';

export type ProjectGraphOptimizations = {
  skipTechnologies?: boolean;
  skipOwners?: boolean;
  skipTags?: boolean;
  truncateTargets?: boolean;
};

export function getProjectGraphPrompt(
  projectGraph: ProjectGraph,
  optimizations?: ProjectGraphOptimizations,
): string {
  return `
The following is a representation of the Nx workspace. It includes all
projects in the monorepo. The projects are separated by <></> tags including the project name.
Each project contains:
- its dependencies (projects that this depends on), marked by "deps: [...]".
- its available targets, marked by "targets: [...]". Targets are tasks that the user can run for each project. Individual atomized targets are excluded.
- its type (libary, app, or e2e tests), marked by "type: [...]".
- its source file location, marked by "root: [...]".
- ${
    optimizations?.skipTags
      ? ''
      : `some metadata like tags ${optimizations?.skipOwners ? '' : ', owners'} ${
          optimizations?.skipTechnologies ? '' : 'or technologies used'
        }.`
  }

This data is very important. Use it to analyze the workspace and provide relevant answers to the user. 
Some of this data is shortened to be more compact. To retrieve the full unabridged details about a project, use the ${NX_PROJECT_DETAILS} tool.
The user cannot see this data, so don't reference it directly. It is read-only, so don't suggest modifications to it.

${getRobotReadableProjectGraph(projectGraph, optimizations)}
`.trim();
}

function getRobotReadableProjectGraph(
  projectGraph: ProjectGraph,
  optimizations?: ProjectGraphOptimizations,
): string {
  let serializedGraph = '';
  Object.entries(projectGraph.nodes).forEach(([name, node]) => {
    let nodeString = `<${name}>`;

    // dependencies
    const deps = projectGraph.dependencies[name]
      .filter((dep) => !projectGraph.externalNodes?.[dep.target])
      .map((dep) => dep.target);

    let depsString = '';
    if (deps.length > 10) {
      depsString = deps.slice(0, 8).join(',') + `,...${deps.length - 8} more`;
    } else {
      depsString = deps.join(', ');
    }

    if (deps.length) {
      nodeString += `deps:[${depsString}]`;
    }

    // targets
    const targetGroups = node.data.metadata?.targetGroups ?? {};
    const targetsToExclude: string[] = [];

    // if there are many targets in a group where one is a root target (because of atomizer), ignore the rest
    for (const group in targetGroups) {
      const targets = targetGroups[group];
      const rootTargets = new Set<string>();

      for (const target of targets) {
        if (targets.some((t) => t !== target && t.startsWith(target))) {
          rootTargets.add(target);
        }
      }

      for (const rootTarget of rootTargets) {
        targetsToExclude.push(
          ...targets.filter(
            (t) => t.startsWith(rootTarget) && t !== rootTarget,
          ),
        );
      }
    }
    const targets = Object.keys(node.data.targets ?? {}).filter(
      (target) =>
        !targetsToExclude.includes(target) &&
        target !== 'nx-release-publish' &&
        target !== 'nxProjectGraph' &&
        target !== 'nxProjectReport',
    );
    let targetsString = '';
    if (targets.length > 10 && optimizations?.truncateTargets) {
      targetsString =
        targets.slice(0, 8).join(',') + `,...${targets.length - 8} more`;
    } else {
      targetsString = targets.join(',');
    }
    if (targetsString !== '') {
      nodeString += `targets:[${targetsString}]`;
    }

    // other metadata
    nodeString += `type:[${node.type}]`;
    const rootString = `root:[${node.data.root}]`;
    nodeString += rootString;
    if (node.data.metadata?.technologies && !optimizations?.skipTechnologies) {
      const technologiesString = `technologies:[${node.data.metadata.technologies.join(
        ',',
      )}]`;
      nodeString += technologiesString;
    }
    if (node.data.metadata?.owners && !optimizations?.skipOwners) {
      const ownersString = `owners:[${Object.keys(
        node.data.metadata.owners,
      ).join(',')}]`;
      nodeString += ownersString;
    }
    if (node.data.tags?.length && !optimizations?.skipTags) {
      const tagsString = `tags:[${node.data.tags.join(',')}]`;
      nodeString += tagsString;
    }
    nodeString += `</>\n`;
    serializedGraph += nodeString;
  });

  return serializedGraph;
}

export function getProjectGraphErrorsPrompt(
  errors: NxError[],
  isPartial: boolean,
): string {
  return `
There were errors while calculating the project graph. ${
    isPartial
      ? 'The following is the list of errors. If the user needs help, you can help fix the errors. Otherwise simply answer the question based on the information available.'
      : 'Due to these errors, project graph creation failed completely. You can help the user fix the errors or simply answer the question based on other information.'
  }
${errors.map((error) => `- ${getMessageForError(error)}`).join('\n')}
`.trim();
}
