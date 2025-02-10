import {
  SystemMessage,
  UserMessage,
  PromptElement,
  BasePromptElementProps,
} from '@vscode/prompt-tsx';
import { ChatContext } from 'vscode';
import { History } from './history';

export interface NxCopilotPromptProps extends BasePromptElementProps {
  packageManagerExecCommand: string;
  projectGraph: Record<string, any>;
  history: ChatContext['history'];
  userQuery: string;
  nxJson: string;
}

export class NxCopilotPrompt extends PromptElement<NxCopilotPromptProps> {
  render() {
    return (
      <>
        <UserMessage priority={100}>
          You are an AI assistant specialized in Nx workspaces and monorepo
          development. You provide precise, technical guidance for developers
          working with Nx tools, patterns, and best practices. You have access
          to the project graph and nx.json and can use it to provide
          context-aware suggestions and solutions. When specifying nx cli
          commands to run, use the full string{''}
          {this.props.packageManagerExecCommand} and wrap each invocation in """
          to be parsed reliably. DO NOT RENDER THE CLI COMMAND IN A CODE BLOCK.
          Remember to: - Provide complete, working examples - Explain your
          approach and any assumptions made about the workspace - Reference
          official Nx documentation when relevant - Use code examples when
          applicable - Be concise and clear
        </UserMessage>
        <History
          history={this.props.history}
          passPriority
          older={0}
          newer={80}
          flexGrow={2}
          flexReserve="/8"
        />
        <UserMessage priority={90}>{this.props.userQuery}</UserMessage>
        <UserMessage priority={60} flexGrow={2}>
          {JSON.stringify(this.props.projectGraph)}
        </UserMessage>
        {/* <UserMessage priority={50} flexGrow={3}>
          {this.props.nxJson}
        </UserMessage> */}
      </>
    );
  }
}
