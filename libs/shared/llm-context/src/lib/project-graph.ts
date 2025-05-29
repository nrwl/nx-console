import type { ProjectGraph } from 'nx/src/devkit-exports';
import type { NxError } from '@nx-console/shared-types';
import { getMessageForError } from '@nx-console/shared-utils';
import { minimatch } from 'minimatch';

export function getProjectGraphPrompt(projectGraph: ProjectGraph): string {
  return `
The following is a representation of the Nx workspace. It includes all
projects in the monorepo. The projects are separated by <></> tags including the project name.
Each project contains:
- its dependencies (projects that this depends on), marked by "deps: [...]".
- its available targets, marked by "targets: [...]". Targets are tasks that the user can run for each project.
- its type (libary, app, or e2e tests), marked by "type: [...]".
- its source file location, marked by "root: [...]".
- some metadata like tags, owners or technologies used.

This data is very important. Use it to analyze the workspace and provide relevant answers to the user. 
The user cannot see this data, so don't reference it directly. It is read-only, so don't suggest modifications to it.

${getRobotReadableProjectGraph(projectGraph)}
`.trim();
}

function getRobotReadableProjectGraph(projectGraph: ProjectGraph): string {
  let serializedGraph = '';
  Object.entries(projectGraph.nodes).forEach(([name, node]) => {
    let nodeString = `<${name}>`;
    nodeString += `deps:[${projectGraph.dependencies[name]
      .filter((dep) => !dep.target.startsWith('npm:'))
      .map((dep) => dep.target)
      .join(', ')}]`;
    nodeString += `targets:[${Object.keys(node.data.targets ?? {}).join(', ')}]`;
    nodeString += `type:[${node.type}]`;
    nodeString += `root:[${node.data.root}]`;
    if (node.data.metadata?.technologies) {
      nodeString += `technologies:[${node.data.metadata.technologies.join(
        ', ',
      )}]`;
    }
    if (node.data.metadata?.owners) {
      nodeString += `owners:[${Object.keys(node.data.metadata.owners).join(
        ', ',
      )}]`;
    }
    if (node.data.tags) {
      nodeString += `tags:[${node.data.tags.join(', ')}]`;
    }
    nodeString += `</${name}>\n`;
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

export interface FilteredProjectGraphResult {
  content: string;
  totalProjects: number;
  includedProjects: number;
  wasFiltered: boolean;
}

export function getFilteredProjectGraphPrompt(
  projectGraph: ProjectGraph,
  options: {
    projectLimit?: number;
    projectFilter?: string;
  },
): FilteredProjectGraphResult {
  const { projectLimit, projectFilter } = options;
  const allProjects = Object.entries(projectGraph.nodes);
  const totalProjects = allProjects.length;
  let filteredProjects = allProjects;
  let wasFiltered = false;

  // Apply glob pattern filtering
  if (projectFilter) {
    const patterns = projectFilter.split(',').map((p) => p.trim());
    filteredProjects = filteredProjects.filter(([name, node]) => {
      return patterns.some((pattern) => {
        // Check against project name and root path
        return minimatch(name, pattern) || minimatch(node.data.root, pattern);
      });
    });
    wasFiltered = true;
  }

  // Apply limit
  if (projectLimit && filteredProjects.length > projectLimit) {
    // Sort alphabetically before limiting
    filteredProjects.sort((a, b) => a[0].localeCompare(b[0]));
    filteredProjects = filteredProjects.slice(0, projectLimit);
    wasFiltered = true;
  }

  const includedProjects = filteredProjects.length;

  // Generate content
  if (includedProjects === 0) {
    return {
      content: 'No projects match the filter criteria',
      totalProjects,
      includedProjects,
      wasFiltered,
    };
  }

  let content = '';

  // Add filter summary if filtered
  if (wasFiltered) {
    content += 'PROJECT GRAPH (FILTERED)\n';
    if (projectFilter) {
      content += `Filter: ${projectFilter}\n`;
    }
    content += `Showing ${includedProjects} of ${totalProjects} projects\n\n`;
  }

  // Add project explanation
  content += `The following is a representation of the Nx workspace projects.${wasFiltered ? ' This is a filtered subset.' : ''}
Each project contains:
- its dependencies (projects that this depends on), marked by "deps: [...]".
- its available targets, marked by "targets: [...]". Targets are tasks that the user can run for each project.
- its type (libary, app, or e2e tests), marked by "type: [...]".
- its source file location, marked by "root: [...]".
- some metadata like tags, owners or technologies used.

This data is very important. Use it to analyze the workspace and provide relevant answers to the user. 
The user cannot see this data, so don't reference it directly. It is read-only, so don't suggest modifications to it.

`;

  // Sort projects alphabetically
  const sortedProjects = [...filteredProjects].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  // Create filtered project graph object
  const filteredGraphNodes: ProjectGraph['nodes'] = {};
  const filteredGraphDeps: ProjectGraph['dependencies'] = {};

  sortedProjects.forEach(([name, node]) => {
    filteredGraphNodes[name] = node;
    filteredGraphDeps[name] = projectGraph.dependencies[name] || [];
  });

  const filteredGraph: ProjectGraph = {
    nodes: filteredGraphNodes,
    dependencies: filteredGraphDeps,
  };

  content += getRobotReadableProjectGraph(filteredGraph);

  return {
    content: content.trim(),
    totalProjects,
    includedProjects,
    wasFiltered,
  };
}
