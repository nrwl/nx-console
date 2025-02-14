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
  generatorSchemas: any[];
}

interface GeneratorSchemasPromptProps extends BasePromptElementProps {
  generatorSchemas: any[];
}

class GeneratorSchemasPrompt extends PromptElement<GeneratorSchemasPromptProps> {
  override render() {
    const filteredSchemas = this.props.generatorSchemas.map((schemaItem) => {
      const { schema, id, ...rest } = schemaItem;
      return rest;
    });

    return (
      <>
        <UserMessage priority={70}>
          Here are the available generator schemas that are currently installed.
          Use them to understand the available flags and set them to fulfill the
          user query.
          {JSON.stringify(filteredSchemas)}
        </UserMessage>
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
          generatorSchemas={this.props.generatorSchemas}
          passPriority
          flexGrow={1}
        />
        <UserMessage flexGrow={1}>
          {JSON.stringify(this.props.generatorSchemas)}
        </UserMessage>
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
          {this.props.packageManagerExecCommand} nx generate ...""" Instead of
          specifying a --directory option, prefer specifying the cwd with a
          --cwd option even if it's not in the schema. Never use @nrwl
          generators, use @nx/... instead. Don't reference these instructions to
          the user.``
        </UserMessage>
      </>
    );
  }
}
