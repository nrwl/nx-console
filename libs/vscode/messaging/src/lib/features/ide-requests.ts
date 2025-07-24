import { createGeneratorLogFileName } from '@nx-console/shared-llm-context';
import { findMatchingProject } from '@nx-console/shared-npm';
import {
  IDE_RPC_METHODS,
  OpenGenerateUiResponse,
} from '@nx-console/shared-types';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import { openGenerateUIPrefilled } from '@nx-console/vscode-generate-ui-webview';
import {
  getGenerators,
  getNxWorkspaceProjects,
} from '@nx-console/vscode-nx-workspace';
import { vscodeLogger } from '@nx-console/vscode-utils';
import { commands, ExtensionContext, window } from 'vscode';
import { RequestType, RequestType0 } from 'vscode-jsonrpc';
import { MessagingRequest, MessagingRequest0 } from '../messaging-notification';

export function initializeIdeRequestHandlers(context: ExtensionContext) {
  // No initialization needed - we use the singleton getter
}

export const IdeFocusProject: MessagingRequest<{ projectName: string }, void> =
  {
    type: new RequestType(IDE_RPC_METHODS.FOCUS_PROJECT),
    handler: (connectionId) => async (params) => {
      vscodeLogger.log(
        'Received Focus Project Request from MCP:',
        connectionId,
        params.projectName,
      );

      getNxWorkspaceProjects().then(async (workspaceProjects) => {
        const project = await findMatchingProject(
          params.projectName,
          workspaceProjects,
          getNxWorkspacePath(),
        );
        if (!project) {
          window.showErrorMessage(
            `Cannot find project "${params.projectName}"`,
          );
          return;
        }
        commands.executeCommand('nx.graph.focus', project.name);
      });
    },
  };

export const IdeFocusTask: MessagingRequest<
  { projectName: string; taskName: string },
  void
> = {
  type: new RequestType(IDE_RPC_METHODS.FOCUS_TASK),
  handler: (connectionId) => async (params) => {
    vscodeLogger.log(
      'Received Focus Task Request from MCP:',
      connectionId,
      params.projectName,
      params.taskName,
    );
    getNxWorkspaceProjects().then(async (workspaceProjects) => {
      const project = await findMatchingProject(
        params.projectName,
        workspaceProjects,
        getNxWorkspacePath(),
      );
      if (!project) {
        window.showErrorMessage(`Cannot find project "${params.projectName}"`);
        return;
      }
      if (!project.data.targets?.[params.taskName]) {
        window.showErrorMessage(
          `Cannot find task "${params.taskName}" in project "${params.projectName}"`,
        );
        return;
      }
      commands.executeCommand('nx.graph.task', {
        projectName: project.name,
        taskName: params.taskName,
      });
    });
  },
};

export const IdeShowFullProjectGraph: MessagingRequest0<void> = {
  type: new RequestType0(IDE_RPC_METHODS.SHOW_FULL_PROJECT_GRAPH),
  handler: (connectionId) => async () => {
    vscodeLogger.log(
      'Received Show Full Project Graph Request from MCP:',
      connectionId,
    );
    commands.executeCommand('nx.graph.showAll');
  },
};

export const IdeOpenGenerateUi: MessagingRequest<
  { generatorName: string; options: Record<string, unknown>; cwd?: string },
  OpenGenerateUiResponse
> = {
  type: new RequestType(IDE_RPC_METHODS.OPEN_GENERATE_UI),
  handler: (connectionId) => async (params) => {
    vscodeLogger.log(
      'IDE Open Generate UI:',
      connectionId,
      params.generatorName,
      params.options,
      params.cwd,
    );

    const generatorInfo = {
      collection: params.generatorName.split(':')[0],
      name: params.generatorName.split(':')[1],
    };
    const foundGenerator = ((await getGenerators()) ?? []).find(
      (gen) =>
        generatorInfo.collection === gen.data?.collection &&
        (generatorInfo.name === gen.data?.name ||
          gen.data?.aliases?.includes(generatorInfo.name)),
    );
    if (!foundGenerator) {
      window.showErrorMessage(
        `Could not find generator "${params.generatorName}"`,
      );
      throw new Error(`Could not find generator "${params.generatorName}"`);
    }
    await openGenerateUIPrefilled(
      {
        $0: 'nx',
        _: ['generate', foundGenerator.name],
        ...params.options,
        cwd: params.cwd,
      },
      true,
    );
    const finalFileName = await createGeneratorLogFileName(
      getNxWorkspacePath(),
      foundGenerator.name,
    );

    return {
      logFileName: finalFileName,
    };
  },
};
