import { PromptElement, SystemMessage, UserMessage } from '@vscode/prompt-tsx';
import { History } from './history';
import { NxCopilotPromptProps } from './prompt';

interface GeneratePromptProps extends NxCopilotPromptProps {
  generatorSchemas: any[];
}

export class GeneratePrompt extends PromptElement<GeneratePromptProps> {
  override render() {
    return (
      <>
        <UserMessage priority={100}>
          You are an AI assistant specialized in Nx workspaces and monorepo
          development. You have access to the project graph and nx.json and
          schemas for running nx generators. Use the user prompt to create a
          generator invocation and return a cli command to run the generator.
          Always finish the response with an nx generator invocation like "nx
          generate ...". Use the full string{' '}
          {this.props.packageManagerExecCommand} and wrap the invocation in """
          to be parsed reliably. DO NOT RENDER THE CLI COMMAND A CODE BLOCK.
        </UserMessage>
        <History
          history={this.props.history}
          passPriority
          older={0}
          newer={80}
          flexGrow={1}
          flexReserve="/8"
        />
        <UserMessage priority={90}>{this.props.userQuery}</UserMessage>
        <UserMessage priority={70} flexGrow={2}>
          {JSON.stringify(this.props.generatorSchemas)}
        </UserMessage>
        <UserMessage priority={60} flexGrow={3}>
          {JSON.stringify(this.props.projectGraph)}
        </UserMessage>
        {/* <UserMessage priority={50} flexGrow={4}>
          {this.props.nxJson}
        </UserMessage> */}
      </>
    );
  }
}
