import { readNxJson } from '@nx-console/shared-npm';
import { getPackageManagerCommand } from '@nx-console/shared-utils';
import {
  getNxWorkspacePath,
  GlobalConfigurationStore,
} from '@nx-console/vscode-configuration';
import { openGenerateUIPrefilled } from '@nx-console/vscode-generate-ui-webview';
import { EXECUTE_ARBITRARY_COMMAND } from '@nx-console/vscode-nx-commands-view';
import { getGenerators, getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { renderPrompt } from '@vscode/prompt-tsx';
import { readFile } from 'fs/promises';
import type { TargetConfiguration } from 'nx/src/devkit-exports.js';
import {
  CancellationToken,
  chat,
  ChatContext,
  ChatRequest,
  ChatRequestHandler,
  ChatResponseStream,
  commands,
  ExtensionContext,
  LanguageModelChatMessage,
  lm,
  MarkdownString,
  Uri,
} from 'vscode';
import { GeneratePrompt } from './prompts/generate-prompt';
import { NxCopilotPrompt, NxCopilotPromptProps } from './prompts/prompt';
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

  stream.progress('Retrieving workspace information...');

  const projectGraph = await getPrunedProjectGraph();

  const pmExec = (await getPackageManagerCommand(workspacePath)).exec;

  let messages: LanguageModelChatMessage[];
  const baseProps: NxCopilotPromptProps = {
    userQuery: request.prompt,
    projectGraph: projectGraph,
    history: context.history,
    nxJson: JSON.stringify(await readNxJson(workspacePath)),
    packageManagerExecCommand: pmExec,
  };

  if (request.command === 'generate') {
    stream.progress('Retrieving generator schemas...');

    const prompt = await renderPrompt(
      GeneratePrompt,
      {
        ...baseProps,
        generatorSchemas: await getGeneratorSchemas(),
      },
      { modelMaxPromptTokens: request.model.maxInputTokens },
      request.model
    );
    messages = prompt.messages;
  } else {
    try {
      const prompt = await renderPrompt(
        NxCopilotPrompt,
        baseProps,
        { modelMaxPromptTokens: request.model.maxInputTokens },
        request.model
      );
      messages = prompt.messages;
    } catch (error) {
      console.error('Error rendering prompt:', error);
      stream.markdown(
        'An error occurred while rendering the prompt. Please try again later.'
      );
      return;
    }
  }

  const chatResponse = await request.model.sendRequest(messages, {}, token);

  const startMarker = new RegExp(`"""\\s*${pmExec}\\s+nx\\s*`);
  const endMarker = `"""`;

  let pendingText = '';
  let codeBuffer: string | null = null;

  for await (const fragment of chatResponse.text) {
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

      renderCommandSnippet(codeSnippet, stream, pmExec);
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

async function renderCommandSnippet(
  snippet: string,
  stream: ChatResponseStream,
  pmExec: string
) {
  snippet = snippet.replace(/\s+/g, ' ');
  const parsedArgs = await yargs.parse(snippet);

  const cleanedSnippet = snippet
    .replace(`--cwd=${parsedArgs['cwd']}`, '')
    .replace(`--cwd ${parsedArgs['cwd']}`, '')
    .trim();

  const markdownString = new MarkdownString();
  markdownString.appendCodeblock(`${pmExec} nx ${cleanedSnippet}`, 'bash');
  stream.markdown(markdownString);
  if (parsedArgs['cwd']) {
    stream.markdown(`cwd: \`${parsedArgs['cwd']}\``);
  }

  const isGenerator = parsedArgs._.includes('generate');
  stream.button({
    title: isGenerator ? 'Execute Generator' : 'Execute Command',
    command: EXECUTE_ARBITRARY_COMMAND,
    arguments: [cleanedSnippet, parsedArgs['cwd']],
  });

  if (isGenerator) {
    stream.button({
      title: 'Adjust in Generate UI',
      command: 'nxConsole.adjustGeneratorInUI',
      arguments: [parsedArgs],
    });
  }
}

async function getPrunedProjectGraph() {
  const nxWorkspace = await getNxWorkspace();
  const projectGraph = nxWorkspace.projectGraph;
  return {
    nodes: Object.entries(projectGraph.nodes)
      .map(([name, node]) => {
        const prunedNode = {
          type: node.type,
          root: node.data.root,
        } as any;
        if (node.data.metadata?.technologies) {
          prunedNode.technologies = node.data.metadata.technologies;
        }
        if (node.data.metadata?.owners) {
          prunedNode.owners = node.data.metadata.owners;
        }
        if (node.data.tags) {
          prunedNode.tags = node.data.tags;
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
              if (
                target.configurations &&
                Object.keys(target.configurations).length > 0
              ) {
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
          [
            key,
            deps
              .filter((dep) => !dep.target.startsWith('npm:'))
              .map((dep) => {
                // almost everything is static, so we want to only include the non-static ones which are interesting
                // TODO: maybe we should tell the model about this assumption
                if (dep.type === 'static') {
                  return {
                    source: dep.source,
                    target: dep.target,
                  };
                } else {
                  return dep;
                }
              }),
          ] as const
      )
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {}),
  };
}

async function getGeneratorSchemas() {
  const generators = await getGenerators();

  const schemas = [];
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

async function adjustGeneratorInUI(
  parsedArgs: Awaited<ReturnType<typeof yargs.parse>>
) {
  await openGenerateUIPrefilled(parsedArgs);
}
