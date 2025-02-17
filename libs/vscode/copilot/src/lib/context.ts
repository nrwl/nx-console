import { readNxJson } from '@nx-console/shared-npm';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { withTimeout } from '@nx-console/shared-utils';
import { getGenerators, getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { getOutputChannel } from '@nx-console/vscode-output-channels';
import type { NxJsonConfiguration, ProjectGraph } from 'nx/src/devkit-exports';
import { xhr } from 'request-light';
import {
  ChatRequestTurn,
  ChatResponseStream,
  ChatResponseTurn,
  MarkdownString,
} from 'vscode';
import { chatResponseToString } from './prompts/history';

export async function getProjectGraph(
  stream: ChatResponseStream
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
      '$(warning) Unable to retrieve workspace information. Proceeding without workspace data.  '
    );
    stream.markdown(md);
  }
  return projectGraph;
}

export async function getGeneratorNamesAndDescriptions(): Promise<
  {
    name: string;
    description: string;
  }[]
> {
  let generators: GeneratorCollectionInfo[];
  try {
    await withTimeout<void>(async () => {
      generators = await getGenerators();
    }, 3000);
  } catch (e) {
    generators = [];
  }

  return generators.map((generator) => ({
    name: generator.name,
    description: generator.data.description,
  }));
}

export async function tryReadNxJson(
  workspacePath: string
): Promise<NxJsonConfiguration | undefined> {
  try {
    return await readNxJson(workspacePath);
  } catch (e) {
    return undefined;
  }
}

export type DocsPageSection = {
  heading: string;
  longer_heading: string;
  content: string;
  similarity: number;
};

export async function getDocsContext(
  prompt: string,
  history: ReadonlyArray<ChatRequestTurn | ChatResponseTurn>
): Promise<DocsPageSection[]> {
  try {
    const messages = history.map((chatItem) => ({
      role: chatItem instanceof ChatRequestTurn ? 'user' : 'assistant',
      content:
        chatItem instanceof ChatRequestTurn
          ? chatItem.prompt
          : chatResponseToString(chatItem),
    }));
    messages.push({
      role: 'user',
      content: prompt,
    });

    const req = await xhr({
      url: 'https://nx-dev-git-embedding-api-nrwl.vercel.app/api/query-ai-embeddings',
      type: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        messages,
      }),
    });

    const response = JSON.parse(req.responseText);
    return response.context.pageSections;
  } catch (error) {
    getOutputChannel().appendLine(
      `Error fetching AI context: ${JSON.stringify(error)}`
    );
    return [];
  }
}
