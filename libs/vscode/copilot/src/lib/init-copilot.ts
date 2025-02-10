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
  LanguageModelChatResponse,
  MarkdownString,
} from 'vscode';
import { getGenerators, getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { BASE_PROMPT, GENERATE_PROMPT } from './prompts/prompt.js';
import type { TargetConfiguration } from 'nx/src/devkit-exports.js';
import {
  getNxWorkspacePath,
  GlobalConfigurationStore,
} from '@nx-console/vscode-configuration';
import { getPackageManagerCommand } from '@nx-console/shared-utils';
import { EXECUTE_ARBITRARY_COMMAND } from '@nx-console/vscode-nx-commands-view';
import { readFile } from 'fs/promises';
import { readNxJson } from '@nx-console/shared-npm';
import { openGenerateUIPrefilled } from '@nx-console/vscode-generate-ui-webview';
import yargs = require('yargs');

export function initCopilot(context: ExtensionContext) {
  const nxParticipant = chat.createChatParticipant('nx-console.nx', handler);
  nxParticipant.iconPath = Uri.joinPath(
    context.extensionUri,
    'assets',
    'nx.png'
  );

  context.subscriptions.push(
    commands.registerCommand(
      'nxConsole.adjustGeneratorInUI',
      adjustGeneratorInUI
    )
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
  const workspacePath = getNxWorkspacePath();
  const pmExec = (await getPackageManagerCommand(workspacePath)).dlx;
  let prompt = BASE_PROMPT(pmExec);

  stream.progress('Retrieving workspace information...');

  const projectGraph = await getPrunedProjectGraph();
  const messages = [LanguageModelChatMessage.User(prompt)];
  messages.push(LanguageModelChatMessage.User(JSON.stringify(projectGraph)));
  messages.push(
    LanguageModelChatMessage.User(
      'nx.json:' + JSON.stringify(await readNxJson(workspacePath))
    )
  );

  if (request.command === 'generate') {
    prompt = GENERATE_PROMPT(pmExec);

    stream.progress('Retrieving generator schemas...');
    const generatorSchemas = await getGeneratorSchemas();
    messages.push(
      LanguageModelChatMessage.User(JSON.stringify(generatorSchemas))
    );
  }

  messages.push(LanguageModelChatMessage.User(request.prompt));

  const chatResponse = await request.model.sendRequest(messages, {}, token);

  const startMarker = new RegExp(`"""\\s*${pmExec}\\s+nx\\s*`);
  const endMarker = `"""`;

  let pendingText = '';
  let codeBuffer: string | null = null;

  let buffer = '';

  for await (const fragment of chatResponse.text) {
    buffer += fragment;
    if (codeBuffer !== null) {
      codeBuffer += fragment;
    } else {
      pendingText += fragment;
    }

    // Process when we're not in a code block: look for a start marker.
    while (codeBuffer === null) {
      const match = pendingText.match(startMarker);
      const startIndex = match ? match.index : -1;
      if (startIndex === -1) {
        break;
      }
      if (startIndex > 0) {
        stream.markdown(pendingText.slice(0, startIndex));
      }
      // Switch to code mode.
      codeBuffer = '';
      pendingText = pendingText.slice(startIndex + match[0].length);
      codeBuffer += pendingText;
      pendingText = '';
    }

    // If we are in a code block, look for the end marker.
    while (codeBuffer !== null) {
      const endIndex = codeBuffer.indexOf(endMarker);
      if (endIndex === -1) {
        break;
      }
      const codeSnippet = codeBuffer.slice(0, endIndex);
      const collapsedCommand = `${pmExec} nx ${codeSnippet}`.replace(
        /\s+/g,
        ' '
      );
      const markdownString = new MarkdownString();
      markdownString.appendCodeblock(collapsedCommand, 'bash');
      stream.markdown(markdownString);

      const isGenerator = collapsedCommand.includes('nx generate');
      stream.button({
        title: isGenerator ? 'Execute Generator' : 'Execute Command',
        command: EXECUTE_ARBITRARY_COMMAND,
        arguments: [codeSnippet],
      });

      if (isGenerator) {
        stream.button({
          title: 'Adjust in Generate UI',
          command: 'nxConsole.adjustGeneratorInUI',
          arguments: [codeSnippet],
        });
      }
      codeBuffer = codeBuffer.slice(endIndex + endMarker.length);

      // switch back to normal mode.
      pendingText += codeBuffer;
      codeBuffer = null;
    }
  }

  if (codeBuffer === null && pendingText) {
    stream.markdown(pendingText);
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

async function getGeneratorSchemas() {
  const generators = await getGenerators();

  const schemas: Array<{ name: string; schema: any }> = [];
  for (const generator of generators) {
    if (generator.schemaPath) {
      try {
        const schemaContent = JSON.parse(
          await readFile(generator.schemaPath, 'utf-8')
        );
        delete schemaContent['$schema'];
        delete schemaContent['$id'];
        schemaContent.name = generator.name;
        schemas.push(schemaContent);
      } catch (error) {
        console.error(
          `Failed to read schema for generator ${generator.name}:`,
          error
        );
      }
    }
  }
  return schemas;
}

async function adjustGeneratorInUI(codeSnippet: string) {
  codeSnippet = codeSnippet.replace('generate', '').replace(/\s+/g, ' ').trim();

  await openGenerateUIPrefilled(codeSnippet);
}
