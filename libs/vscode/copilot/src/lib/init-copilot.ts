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
import type { NxJsonConfiguration } from 'nx/src/devkit-exports.js';
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
  LanguageModelChatMessageRole,
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

  const intent = await determineIntent(request);

  const workspacePath = getNxWorkspacePath();

  stream.progress('Retrieving workspace information...');

  const projectGraph = (await getNxWorkspace()).projectGraph;

  const pmExec = (await getPackageManagerCommand(workspacePath)).exec;

  const nxJson = await tryReadNxJson(workspacePath);

  const baseProps: NxCopilotPromptProps = {
    userQuery: request.prompt,
    history: context.history,
    packageManagerExecCommand: pmExec,
    projectGraph,
    nxJson,
  };

  let promptElementAndProps: PromptElementAndProps<
    NxCopilotPrompt | GeneratePrompt
  >;

  if (request.command === 'generate' || intent === 'generate') {
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

export async function tryReadNxJson(
  workspacePath: string
): Promise<NxJsonConfiguration | undefined> {
  try {
    return await readNxJson(workspacePath);
  } catch (e) {
    return undefined;
  }
}
async function determineIntent(
  request: ChatRequest
): Promise<'generate' | 'other'> {
  const messages = [
    new LanguageModelChatMessage(
      LanguageModelChatMessageRole.User,
      `
      You are a classification system for an nx AI assistant. Classify the following user query into one of the following categories:
      - <generate>
      - <other>

      Return one of these categories, wrapped in a tag like this: <other>. Return only one category.
      If the user clearly wants to generate something, like a component, app, library or run any other kind of generator, classify it as <generate>.
      Otherwise, classify it as <other>.
      Here are some examples marked with Q for the query and A for the answer:
      - Q: "Generate a library called ui-feature" A: <generate>
      - Q: "Run the affected command" A: <other>
      - Q: "Can you create a new react app?" A: <generate>
      - Q: "What is the best way to test my app?" A: <other>
      - Q: "Setup a new Nx workspace with React and Typescript" A: <generate>
      - Q: "How do I run affected commands in Nx?" A: <other>
      - Q: "Make a new e2e testing project" A: <generate>

      If you are unsure, classify it as <other>. If the user query is not clear, classify it as <other>.
      Here is the user query: "${request.prompt}"
      `
    ),
  ];
  let buffer = '';
  try {
    const stream = await request.model.sendRequest(messages, {
      justification: 'Determine the intent of the user query',
    });

    for await (const fragment of stream.text) {
      buffer += fragment;
    }

    if (buffer.includes(`<generate>`)) {
      return 'generate';
    } else {
      return 'other';
    }
  } catch (e) {
    return 'other';
  }
}
