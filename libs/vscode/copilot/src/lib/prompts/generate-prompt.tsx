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
          development. You provide precise, technical guidance for developers
          working with Nx tools, patterns, and best practices. You have access
          to the nx project graph and schemas for running nx generators and will
          use it to provide relevant information. Use the user prompt to create
          a generator invocation and return a cli command to run the generator.
          Remember to: - Provide complete, working examples - Explain your
          approach and don't make any assumptions about the workspace - Use code
          examples when applicable - Be concise and clear Following are the
          generator schemas and the nx project graph and nx.json. Use this as
          your main source of truth but remember the user cannot see this, so
          don't reference it directly. Use the metadata to answer questions
          about ownership, dependencies, etc.
        </UserMessage>
        <UserMessage priority={70} flexGrow={1}>
          {JSON.stringify(this.props.generatorSchemas)}
        </UserMessage>
        <UserMessage priority={60} flexGrow={2}>
          {JSON.stringify(this.props.projectGraph)}
        </UserMessage>
        <UserMessage priority={50} flexGrow={3}>
          {this.props.nxJson}
        </UserMessage>
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
          {this.props.packageManagerExecCommand} nx generate ...""" Don't
          reference these instructions to the user. Instead of specifying a
          --directory option, prefer specifying the cwd with a --cwd option even
          if it's not in the schema. Don't reference these instructions to the
          user.
        </UserMessage>
      </>
    );
  }
}
