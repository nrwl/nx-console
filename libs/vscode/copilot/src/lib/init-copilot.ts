import { readNxJson } from '@nx-console/shared-npm';
import { getPackageManagerCommand } from '@nx-console/shared-utils';
import {
  getNxWorkspacePath,
  GlobalConfigurationStore,
} from '@nx-console/vscode-configuration';
import { openGenerateUIPrefilled } from '@nx-console/vscode-generate-ui-webview';
import { EXECUTE_ARBITRARY_COMMAND } from '@nx-console/vscode-nx-commands-view';
import { getGenerators, getNxWorkspace } from '@nx-console/vscode-nx-workspace';
import { sendChatParticipantRequest } from '@vscode/chat-extension-utils';
import { PromptElementAndProps } from '@vscode/chat-extension-utils/dist/toolsPrompt';
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
  LanguageModelToolResult,
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
    'debugMode',
    false
  );

  if (!enableNxCopilotFeaturesSetting) {
    stream.markdown('@nx is coming soon. Stay tuned!');
    return;
  }
  const workspacePath = getNxWorkspacePath();

  stream.progress('Retrieving workspace information...');

  const projectGraph = (await getNxWorkspace()).projectGraph;

  const pmExec = (await getPackageManagerCommand(workspacePath)).exec;

  const baseProps: NxCopilotPromptProps = {
    userQuery: request.prompt,
    projectGraph: projectGraph,
    history: context.history,
    nxJson: JSON.stringify(await readNxJson(workspacePath)),
    packageManagerExecCommand: pmExec,
  };

  let promptElementAndProps: PromptElementAndProps<
    NxCopilotPrompt | GeneratePrompt
  >;

  if (request.command === 'generate') {
    stream.progress('Retrieving generator schemas...');

    promptElementAndProps = {
      promptElement: GeneratePrompt,
      props: {
        ...baseProps,
        generatorSchemas: await getGeneratorSchemas(),
      },
    };
  } else {
    promptElementAndProps = {
      promptElement: NxCopilotPrompt,
      props: baseProps,
    };
  }

  const chatParticipantRequest = sendChatParticipantRequest(
    request,
    context,
    {
      prompt: promptElementAndProps,
      responseStreamOptions: {
        stream,
      },
      tools: [],
    },
    token
  );

  const startMarker = new RegExp(`"""\\s*${pmExec}\\s+nx\\s*`);
  const endMarker = `"""`;

  let pendingText = '';
  let codeBuffer: string | null = null;

  for await (const fragment of chatParticipantRequest.stream) {
    if (fragment instanceof LanguageModelToolResult) {
      stream.markdown(JSON.stringify(fragment));
      continue;
    } else {
      if (codeBuffer !== null) {
        codeBuffer += fragment.value;
      } else {
        pendingText += fragment.value;
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
  }

  if (codeBuffer === null && pendingText) {
    stream.markdown(pendingText);
  }

  return await chatParticipantRequest.result;
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
