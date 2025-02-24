import {
  SystemMessage,
  UserMessage,
  PromptElement,
  BasePromptElementProps,
} from '@vscode/prompt-tsx';
import { ChatContext } from 'vscode';
import { History } from './history';
import { NxProjectGraphPrompt } from './project-graph-prompt';
import type { NxJsonConfiguration, ProjectGraph } from 'nx/src/devkit-exports';
import { NxJsonPrompt } from './nx-json-prompt';
import { DocsPagesPrompt } from './docs-pages-prompt';
import { DocsPageSection } from '@nx-console/shared-llm-context';

export interface NxCopilotPromptProps extends BasePromptElementProps {
  packageManagerExecCommand: string;
  projectGraph: ProjectGraph;
  history: ChatContext['history'];
  userQuery: string;
  nxJson: NxJsonConfiguration;
  docsPages: DocsPageSection[];
}

export class NxCopilotPrompt extends PromptElement<NxCopilotPromptProps> {
  render() {
    return (
      <>
        <BaseSystemPrompt
          passPriority
          packageManagerExecCommand={this.props.packageManagerExecCommand}
        />
        <NxProjectGraphPrompt
          projectGraph={this.props.projectGraph}
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
          flexGrow={4}
        />
        <UserMessage priority={90}>{this.props.userQuery}</UserMessage>
      </>
    );
  }
}

export interface BaseSystemPromptProps extends BasePromptElementProps {
  packageManagerExecCommand: string;
  passPriority: true;
}

export class BaseSystemPrompt extends PromptElement<BaseSystemPromptProps> {
  render() {
    return (
      <UserMessage priority={100}>
        You are an AI assistant specialized in Nx workspaces and monorepo
        development. You provide precise, technical guidance for developers
        working with Nx tools, patterns, and best practices. When specifying nx
        cli commands to run, use the full string{''}
        {this.props.packageManagerExecCommand} and wrap each invocation in
        triple quotes to be parsed reliably. Example: """
        {this.props.packageManagerExecCommand} nx run project:target""". DO NOT
        RENDER THE CLI COMMAND IN A CODE BLOCK. You should work in two steps: -
        First, analyze the passed metadata about the nx workspace - Second, read
        the chat history and user query and provide a helpful, concise response
        to the user. The user cannot see this metadata, so don't reference it
        directly. Do not make any assumptions about the workspace or your
        knowledge of nx, use the provided explanations to guide you. Be concise
        and helpful. Provide code examples when applicable. Use the provided
        tools available to you to answer the users query.
      </UserMessage>
    );
  }
}
