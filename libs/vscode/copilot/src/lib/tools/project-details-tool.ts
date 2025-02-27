import { getNxWorkspaceProjects } from '@nx-console/vscode-nx-workspace';
import {
  CancellationToken,
  LanguageModelTextPart,
  LanguageModelTool,
  LanguageModelToolInvocationOptions,
  LanguageModelToolInvocationPrepareOptions,
  LanguageModelToolResult,
  PreparedToolInvocation,
} from 'vscode';

export interface ProjectDetailsToolInput {
  projectName: string;
}

export class ProjectDetailsTool
  implements LanguageModelTool<ProjectDetailsToolInput>
{
  async invoke(
    options: LanguageModelToolInvocationOptions<ProjectDetailsToolInput>,
    token: CancellationToken,
  ): Promise<LanguageModelToolResult> {
    const params = options.input;

    // Retrieve all projects in the workspace
    const projects = await getNxWorkspaceProjects();

    // Find the project matching the given name
    const project = projects?.[params.projectName];

    if (!project) {
      return new LanguageModelToolResult([
        new LanguageModelTextPart(`Project ${params.projectName} not found`),
      ]);
    }

    return new LanguageModelToolResult([
      new LanguageModelTextPart(
        `Found project configuration for ${params.projectName}: ${JSON.stringify(project.data, null, 2)}`,
      ),
    ]);
  }

  prepareInvocation(
    options: LanguageModelToolInvocationPrepareOptions<ProjectDetailsToolInput>,
    token: CancellationToken,
  ): PreparedToolInvocation {
    return {
      invocationMessage: 'Reading project configuration...',
    };
  }
}
