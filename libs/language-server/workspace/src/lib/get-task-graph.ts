import { importNxPackagePath } from '@nx-console/shared-npm';
import { nxWorkspace } from '@nx-console/shared-nx-workspace-info';
import { Logger } from '@nx-console/shared-utils';

export async function getTaskGraph(
  workspacePath: string,
  targets: string[],
  projects: string[] | undefined,
  configuration: string | undefined,
  logger: Logger,
): Promise<any> {
  try {
    const workspace = await nxWorkspace(workspacePath, logger);
    const { projectGraph, nxJson } = workspace;

    if (!projectGraph || !nxJson) {
      throw new Error('Unable to get project graph or nx.json');
    }

    const createTaskGraphModule = await importNxPackagePath<{
      createTaskGraphForTargetsAndProjects: (
        projectGraph: any,
        nxJson: any,
        targetNames: string[],
        projectNames?: string[],
        configuration?: string,
      ) => Promise<any>;
    }>(
      workspacePath,
      'src/command-line/graph/create-task-graph-for-targets-and-projects.js',
      logger,
    );

    const taskGraphResponse =
      await createTaskGraphModule.createTaskGraphForTargetsAndProjects(
        projectGraph,
        nxJson,
        targets,
        projects,
        configuration,
      );

    return taskGraphResponse;
  } catch (error) {
    logger.log(`Error creating task graph: ${error}`);
    throw error;
  }
}
