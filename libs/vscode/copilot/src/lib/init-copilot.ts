import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatRequestHandler,
  ChatResponseStream,
  ExtensionContext,
  LanguageModelChatMessage,
  Uri,
  chat,
} from 'vscode';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { BASE_PROMPT } from './prompt.js';

export function initCopilot(context: ExtensionContext) {
  const nxParticipant = chat.createChatParticipant('nx-console.nx', handler);
  nxParticipant.iconPath = Uri.joinPath(
    context.extensionUri,
    'assets',
    'nx.png'
  );
}

const handler: ChatRequestHandler = async (
  request: ChatRequest,
  context: ChatContext,
  stream: ChatResponseStream,
  token: CancellationToken
) => {
  const prompt = BASE_PROMPT;

  stream.progress('Retrieving workspace information...');

  const projectGraph = await getPrunedProjectGraph();

  const messages = [LanguageModelChatMessage.User(prompt)];

  messages.push(LanguageModelChatMessage.User(request.prompt));
  messages.push(LanguageModelChatMessage.User(JSON.stringify(projectGraph)));

  const chatResponse = await request.model.sendRequest(messages, {}, token);

  for await (const fragment of chatResponse.text) {
    stream.markdown(fragment);
  }

  return;
};

async function getPrunedProjectGraph() {
  const nxWorkspace = await getNxWorkspace();
  const projectGraph = nxWorkspace.projectGraph;
  return {
    nodes: Object.entries(projectGraph.nodes)
      .map(([name, node]) => {
        const prunedNode = {
          type: node.type,
        } as any;
        if (node.data.metadata?.technologies) {
          prunedNode.technologies = node.data.metadata.technologies;
        }
        return [name, prunedNode] as const;
      })
      .reduce((acc, [name, node]) => {
        acc[name] = node;
        return acc;
      }, {}),
    dependencies: Object.entries(projectGraph.dependencies)
      .filter(([key]) => !key.startsWith('npm:'))
      .map(
        ([key, deps]) =>
          [key, deps.filter((dep) => !dep.target.startsWith('npm:'))] as const
      )
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {}),
  };
}
