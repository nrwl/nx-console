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
  commands,
  Command,
} from 'vscode';
import { getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { BASE_PROMPT, GENERATE_PROMPT } from './prompt.js';
import type { TargetConfiguration } from 'nx/src/devkit-exports.js';
import { GlobalConfigurationStore } from '@nx-console/vscode-configuration';

const OPEN_COPILOT_SETTING_COMMAND = 'nxConsole.openCopilotSettings';

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
  const enableNxCopilotFeaturesSetting = GlobalConfigurationStore.instance.get(
    'enableNxCopilotFeatures',
    false
  );

  if (!enableNxCopilotFeaturesSetting) {
    stream.markdown(
      'The @nx copilot chat participant is experimental. To use it, please enable it in the settings.'
    );

    stream.button({
      title: 'Enable Nx Copilot',
      command: 'workbench.action.openSettings',
      arguments: ['nxConsole.enableNxCopilotFeatures'],
    });
    return;
  }
  const prompt = BASE_PROMPT;

  stream.progress('Retrieving workspace information...');

  const projectGraph = await getPrunedProjectGraph();

  // if (request.command === 'generate') {
  //   prompt = GENERATE_PROMPT;
  // }

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
        if (node.data.targets) {
          prunedNode.targets = Object.entries(node.data.targets)
            .map(([key, target]) => {
              const prunedTarget = {
                executor: target.executor,
              } as Partial<TargetConfiguration>;
              if (target.command) {
                prunedTarget.command = target.command;
              }
              if (target.options.commands) {
                prunedTarget.command = target.options.commands;
              }
              if (target.configurations) {
                prunedTarget.configurations = Object.keys(
                  target.configurations
                );
              }
              return [key, prunedTarget] as const;
            })
            .reduce((acc, [key, target]) => {
              acc[key] = target;
              return acc;
            }, {});
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
