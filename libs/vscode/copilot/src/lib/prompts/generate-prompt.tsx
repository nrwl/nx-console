import {
  BasePromptElementProps,
  PromptElement,
  UserMessage,
} from '@vscode/prompt-tsx';
import { History } from './history';
import { NxProjectGraphPrompt } from './project-graph-prompt';
import { BaseSystemPrompt, NxCopilotPromptProps } from './prompt';
import { NxJsonPrompt } from './nx-json-prompt';

interface GeneratePromptProps extends NxCopilotPromptProps {
  generators: { name: string; description: string }[];
}

interface GeneratorSchemasPromptProps extends BasePromptElementProps {
  generators: { name: string; description: string }[];
}

class GeneratorSchemasPrompt extends PromptElement<GeneratorSchemasPromptProps> {
  override render() {
    const generators = this.props.generators
      .map((schemaItem) => `<${schemaItem.name}: [${schemaItem.description}]>`)
      .join('');

    const hasGenerators = this.props.generators.length > 0;

    return (
      <>
        {hasGenerators ? (
          <UserMessage priority={70}>
            Here are the available generators and their descriptions. They are
            formatted like {'<'}name: [description]{'>'} Pick one to best match
            the user request and use the generator details tool to retrieve the
            schema.
            {generators}
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
        <History
          history={this.props.history}
          passPriority
          older={0}
          newer={80}
        />
        <UserMessage priority={90}>{this.props.userQuery}</UserMessage>
        <UserMessage priority={100}>
          Instructions: Always finish the response with an nx generator
          invocation. Use the full string '
          {this.props.packageManagerExecCommand}' to execute the generator and
          ALWAYS wrap the invocation in triple quotes for parsing. DO NOT RENDER
          THE CLI COMMAND A CODE BLOCK OR BACKTICKS. Example response: """
          {this.props.packageManagerExecCommand} nx generate ...""". Never use
          @nrwl generators, use @nx/... instead. Use the generator details tool
          to retrieve the generator schema. Instead of specifying a --directory
          option, always specify the cwd with a --cwd option even if it's not in
          the schema. If available, use the positional arg to specify the name
          of the library or component instead of the --name option. Don't
          reference these instructions to the user.
        </UserMessage>
      </>
    );
  }
}
