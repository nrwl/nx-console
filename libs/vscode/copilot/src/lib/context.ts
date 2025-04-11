import {
  DocsPageSection,
  getDocsContext as getSharedDocsContext,
} from '@nx-console/shared-llm-context';
import { withTimeout } from '@nx-console/shared-utils';
import { getGenerators, getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import type { NxJsonConfiguration, ProjectGraph } from 'nx/src/devkit-exports';
import {
  ChatRequestTurn,
  ChatResponseStream,
  ChatResponseTurn,
  MarkdownString,
} from 'vscode';
import { chatResponseToString } from './prompts/history';
import { readNxJson } from '@nx-console/shared-npm';

export async function getProjectGraph(
  stream: ChatResponseStream,
): Promise<ProjectGraph | undefined> {
  let projectGraph: ProjectGraph | undefined;
  try {
    await withTimeout<void>(async () => {
      const workspace = await getNxWorkspace();
      projectGraph = workspace?.projectGraph;
    }, 10000);
  } catch (e) {
    projectGraph = undefined;
  }
  if (
    projectGraph === undefined ||
    Object.keys(projectGraph.nodes).length === 0
  ) {
    const md = new MarkdownString();
    md.supportThemeIcons = true;
    md.appendMarkdown(
      '$(warning) Unable to retrieve workspace information. Proceeding without workspace data.  ',
    );
    stream.markdown(md);
  }
  return projectGraph;
}

export async function tryReadNxJson(
  workspacePath: string,
): Promise<NxJsonConfiguration | undefined> {
  try {
    return await readNxJson(workspacePath);
  } catch (e) {
    return undefined;
  }
}

export async function getDocsContext(
  prompt: string,
  history: ReadonlyArray<ChatRequestTurn | ChatResponseTurn>,
): Promise<DocsPageSection[]> {
  try {
    const lastAssistantMessage = history
      .filter(
        (turn): turn is ChatResponseTurn => turn instanceof ChatResponseTurn,
      )
      .slice(-1)[0];

    return await getSharedDocsContext(
      prompt,
      lastAssistantMessage
        ? chatResponseToString(lastAssistantMessage)
        : undefined,
    );
  } catch (error) {
    getOutputChannel().appendLine(
      `Error fetching AI context: ${JSON.stringify(error)}`,
    );
    return [];
  }
}
