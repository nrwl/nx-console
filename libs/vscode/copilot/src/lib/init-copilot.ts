import { getPackageManagerCommand } from '@nx-console/shared-npm';
import { getNxWorkspacePath } from '@nx-console/vscode-configuration';
import {
  getFillWithGenerateUiService,
  openGenerateUIPrefilled,
  updateGenerateUIValues,
} from '@nx-console/vscode-generate-ui-webview';
import { EXECUTE_ARBITRARY_COMMAND } from '@nx-console/vscode-nx-commands-view';
import { getTelemetry } from '@nx-console/vscode-telemetry';
import { sendChatParticipantRequest } from '@vscode/chat-extension-utils';
import { PromptElementAndProps } from '@vscode/chat-extension-utils/dist/toolsPrompt';
import {
  CancellationToken,
  chat,
  ChatContext,
  ChatFollowup,
  ChatRequest,
  ChatRequestHandler,
  ChatResponseStream,
  ChatResult,
  ChatResultFeedbackKind,
  commands,
  ExtensionContext,
  LanguageModelChatMessage,
  LanguageModelChatMessageRole,
  LanguageModelToolResult,
  lm,
  MarkdownString,
  Uri,
} from 'vscode';
import { getDocsContext, getProjectGraph, tryReadNxJson } from './context';
import { GeneratePrompt } from './prompts/generate-prompt';
import { NxCopilotPrompt, NxCopilotPromptProps } from './prompts/prompt';
import { GeneratorDetailsTool } from './tools/generator-details-tool';
import yargs = require('yargs');
import {
  getGeneratorNamesAndDescriptions,
  getGeneratorSchema,
} from '@nx-console/shared-llm-context';
import { GeneratorCollectionInfo } from '@nx-console/shared-schema';
import { withTimeout } from '@nx-console/shared-utils';
import { getGenerators } from '@nx-console/vscode-nx-workspace';
import { ProjectDetailsTool } from './tools/project-details-tool';
import { VisualizeProjectGraphTool } from './tools/visualize-project-graph-tool';
import { VisualizeTaskGraphTool } from './tools/visualize-task-graph-tool';
import { explainCipe } from './commands/explain-cipe';
import { AvailablePluginsTool } from './tools/available-plugins-tool';
import { OpenGenerateUiTool } from './tools/open-generate-ui-tool';
import { VisualizeFullProjectGraphTool } from './tools/visualize-full-project-graph-tool';
import { FillGenerateUIPrompt } from './prompts/fill-generate-ui-prompt';

export function initCopilot(context: ExtensionContext) {
  const telemetry = getTelemetry();
  const nxParticipant = chat.createChatParticipant(
    'nx-console.nx',
    handler(context),
  );
  nxParticipant.iconPath = Uri.joinPath(
    context.extensionUri,
    'assets',
    'nx.png',
  );
  nxParticipant.onDidReceiveFeedback((feedback) => {
    telemetry.logUsage(
      feedback.kind === ChatResultFeedbackKind.Helpful
        ? 'ai.feedback-good'
        : 'ai.feedback-bad',
    );
  });
  nxParticipant.followupProvider = {
    provideFollowups(
      result: ChatResult,
      context: ChatContext,
      token: CancellationToken,
    ) {
      if (result.metadata?.command === 'explain-cipe') {
        return [
          {
            prompt: 'Can you fix the error?',
            command: 'fix-cipe',
          } satisfies ChatFollowup,
        ];
      }
    },
  };

  context.subscriptions.push(
    nxParticipant,
    lm.registerTool('nx_generator-details', new GeneratorDetailsTool()),
    lm.registerTool('nx_project-details', new ProjectDetailsTool()),
    lm.registerTool(
      'nx_visualize-project-graph-project',
      new VisualizeProjectGraphTool(),
    ),
    lm.registerTool('nx_visualize-task-graph', new VisualizeTaskGraphTool()),
    lm.registerTool('nx_available-plugins', new AvailablePluginsTool()),
    lm.registerTool('nx_open-generate-ui', new OpenGenerateUiTool()),
    lm.registerTool(
      'nx_visualize-full-project-graph',
      new VisualizeFullProjectGraphTool(),
    ),
  );

  context.subscriptions.push(
    commands.registerCommand(
      'nxConsole.adjustGeneratorInUI',
      adjustGeneratorInUI,
    ),
    commands.registerCommand(
      'nxConsole.executeResponseCommand',
      executeResponseCommand,
    ),
  );
}

const handler: (context: ExtensionContext) => ChatRequestHandler =
  (extensionContext: ExtensionContext) =>
  async (
    request: ChatRequest,
    context: ChatContext,
    stream: ChatResponseStream,
    token: CancellationToken,
  ) => {
    const telemetry = getTelemetry();
    telemetry.logUsage('ai.chat-message');

    if (request.command === 'explain-cipe') {
      await explainCipe(request, context, stream, token, extensionContext);
      return;
    }

    const intent = await determineIntent(request);
    const workspacePath = getNxWorkspacePath();

    stream.progress('Retrieving workspace information...');
    const projectGraph = await getProjectGraph(stream);

    stream.progress('Retrieving relevant documentation...');
    const docsPages = await getDocsContext(request.prompt, context.history);

    const pmExec = (await getPackageManagerCommand(workspacePath)).exec;
    const nxJson = await tryReadNxJson(workspacePath);

    let generators: GeneratorCollectionInfo[];
    try {
      generators = await withTimeout<GeneratorCollectionInfo[]>(
        async () => await getGenerators(),
        3000,
      );
    } catch (e) {
      generators = [];
    }
    const generatorNamesAndDescriptions =
      await getGeneratorNamesAndDescriptions(generators);

    const baseProps: NxCopilotPromptProps = {
      userQuery: request.prompt,
      history: context.history,
      packageManagerExecCommand: pmExec,
      projectGraph,
      nxJson,
      docsPages,
    };

    let promptElementAndProps: PromptElementAndProps<
      NxCopilotPrompt | GeneratePrompt | FillGenerateUIPrompt
    >;

    if (request.command === 'fill-generate-ui') {
      const fillInfo = getFillWithGenerateUiService().getFillInfo();
      const generators = await getGenerators();
      const schema = await getGeneratorSchema(
        fillInfo.generatorName,
        generators,
      );

      promptElementAndProps = {
        promptElement: FillGenerateUIPrompt,
        props: {
          formValues: fillInfo.formValues,
          generatorName: fillInfo.generatorName,
          generatorSchema: schema,
          ...baseProps,
        },
      };
    } else if (request.command === 'generate' || intent === 'generate') {
      stream.progress('Retrieving generator schemas...');

      promptElementAndProps = {
        promptElement: GeneratePrompt,
        props: {
          ...baseProps,
          generators: generatorNamesAndDescriptions,
        },
      };
    } else {
      promptElementAndProps = {
        promptElement: NxCopilotPrompt,
        props: baseProps,
      };
    }

    stream.progress('Thinking...');

    const chatParticipantRequest = sendChatParticipantRequest(
      request,
      context,
      {
        prompt: promptElementAndProps,
        responseStreamOptions: {
          stream,
        },
        tools: lm.tools,
      },
      token,
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
      if (request.command === 'fill-generate-ui') {
        // we don't want to just output everything, instead we want to send code blocks back to the UI
        if (pendingText.startsWith('```')) {
          const codeBlockPattern = /^```(?:json)?\s*\n([\s\S]*?)\n```$/;
          const trimmedText = pendingText.trim();
          const match = trimmedText.match(codeBlockPattern);
          if (match) {
            const codeContent = match[1].trim();
            try {
              const parsed = JSON.parse(codeContent);
              updateGenerateUIValues(parsed);
              getFillWithGenerateUiService().clearFillInfo();
              stream.markdown('Updated Generate UI \n');
              const updatedValues = Object.entries(parsed);
              if (updatedValues.length) {
                const bulletList = updatedValues
                  .map(([key, value]) => `- ${key}: ${value}`)
                  .join('\n');
                stream.markdown(bulletList);
              }
            } catch (error) {
              stream.markdown(trimmedText);
              return;
            }
          } else {
            stream.markdown(trimmedText);
          }
        }
      } else {
        stream.markdown(pendingText);
      }
    }

    return await chatParticipantRequest.result;
  };

async function renderCommandSnippet(
  snippet: string,
  stream: ChatResponseStream,
  pmExec: string,
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
    command: 'nxConsole.executeResponseCommand',
    arguments: [cleanedSnippet, parsedArgs],
  });

  if (isGenerator) {
    stream.button({
      title: 'Adjust in Generate UI',
      command: 'nxConsole.adjustGeneratorInUI',
      arguments: [parsedArgs],
    });
  }
}

async function adjustGeneratorInUI(
  parsedArgs: Awaited<ReturnType<typeof yargs.parse>>,
) {
  getTelemetry().logUsage('ai.response-interaction', {
    kind: 'adjust-generator',
  });
  await openGenerateUIPrefilled(parsedArgs);
}

function executeResponseCommand(
  snippet: string,
  parsedArgs: Awaited<ReturnType<typeof yargs.parse>>,
) {
  const isGenerator = parsedArgs._.includes('generate');
  getTelemetry().logUsage('ai.response-interaction', {
    kind: isGenerator ? 'execute-generate' : 'execute-command',
  });
  commands.executeCommand(
    EXECUTE_ARBITRARY_COMMAND,
    snippet,
    parsedArgs['cwd'],
  );
}

async function determineIntent(
  request: ChatRequest,
): Promise<'generate' | 'other'> {
  const messages = [
    new LanguageModelChatMessage(
      LanguageModelChatMessageRole.User,
      `
      You are a classification system for an nx AI assistant. Classify the following user query into one of the following categories:
      - <generate>
      - <other>

      Return one of these categories, wrapped in a tag like this: <other>. Return only one category.
      If the user wants to generate something or is interested in generators or related functionality classify it as <generate>.
      Otherwise, classify it as <other>.
      Here are some examples marked with Q for the query and A for the answer:
      - Q: "Generate a library called ui-feature" A: <generate>
      - Q: "Run the affected command" A: <other>
      - Q: "Can you create a new react app?" A: <generate>
      - Q: "What is the best way to test my app?" A: <other>
      - Q: "Setup a new Nx workspace with React and Typescript" A: <generate>
      - Q: "How do I run affected commands in Nx?" A: <other>
      - Q: "Make a new e2e testing project" A: <generate>
      - Q: "I need to create a lib with some features. Where should I do it?" A: <generate>
      - Q: "How do I set up a new app?" A: <generate>

      If the user query is not clear, classify it as <other>. If you are unsure, classify it as <generate>.
      Here is the user query: "${request.prompt}"
      `,
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
