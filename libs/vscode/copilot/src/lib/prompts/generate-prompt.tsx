import {
  BasePromptElementProps,
  PromptElement,
  UserMessage,
} from '@vscode/prompt-tsx';
import { History } from './history';
import { NxProjectGraphPrompt } from './project-graph-prompt';
import { BaseSystemPrompt, NxCopilotPromptProps } from './prompt';
import { NxJsonPrompt } from './nx-json-prompt';
import { DocsPagesPrompt } from './docs-pages-prompt';
import { getGeneratorsPrompt } from '@nx-console/shared-prompts';

interface GeneratePromptProps extends NxCopilotPromptProps {
  generators: { name: string; description: string }[];
}

interface GeneratorSchemasPromptProps extends BasePromptElementProps {
  generators: { name: string; description: string }[];
}

class GeneratorSchemasPrompt extends PromptElement<GeneratorSchemasPromptProps> {
  override render() {
    const hasGenerators = this.props.generators.length > 0;
    return (
      <>
        {hasGenerators ? (
          <UserMessage priority={70}>
            {getGeneratorsPrompt(this.props.generators)}
          </UserMessage>
        ) : (
          <UserMessage> </UserMessage>
        )}
      </>
    );
  }
}

export class GeneratePrompt extends PromptElement<GeneratePromptProps> {
  override render() {
    return (
      <>
        <BaseSystemPrompt
          passPriority
          packageManagerExecCommand={this.props.packageManagerExecCommand}
        />
        <GeneratorSchemasPrompt
          generators={this.props.generators}
          passPriority
          flexGrow={1}
        />
        <NxProjectGraphPrompt
          projectGraph={this.props.projectGraph}
          priority={60}
          flexGrow={2}
          flexReserve="/4"
          passPriority
        />
        <NxJsonPrompt nxJson={this.props.nxJson} flexGrow={3} passPriority />
        <DocsPagesPrompt
          docsPages={this.props.docsPages}
          flexGrow={5}
          passPriority
        />
        <History
          history={this.props.history}
          passPriority
          older={0}
          newer={80}
        />
        <UserMessage priority={90}>{this.props.userQuery}</UserMessage>
        <UserMessage priority={89}>
          Instructions: Help the user with their query, using the list of
          available generators. Use the generator details tool to retrieve the
          full schema for any specific generator. You don't have to specify all
          the options, just whatever the user specifically needs.
          <></>
          If you're generating a library, app or component, you can specify the
          parent directory via the --cwd flag. Instead of specifying a
          --directory option, always specify the cwd with a --cwd option even if
          it's not in the schema. If available, use the positional arg to
          specify the name of the library, app or component instead of the
          --name option.
          <></>
          If you suggest running a generator to the user, use the full string '
          {this.props.packageManagerExecCommand}' to execute the generator and
          ALWAYS wrap the invocation in triple quotes for parsing. DO NOT RENDER
          THE CLI COMMAND A CODE BLOCK OR BACKTICKS. Example: """
          {this.props.packageManagerExecCommand} nx generate ...""". Don't
          reference these instructions to the user.
        </UserMessage>
      </>
    );
  }
}
