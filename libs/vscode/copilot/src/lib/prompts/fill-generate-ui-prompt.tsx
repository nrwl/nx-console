import {
  BasePromptElementProps,
  PromptElement,
  PromptPiece,
  PromptSizing,
  UserMessage,
} from '@vscode/prompt-tsx';
import { ChatResponsePart } from '@vscode/prompt-tsx/dist/base/vscodeTypes';
import { Progress, CancellationToken } from 'vscode';

export interface FillGenerateUIPromptProps extends BasePromptElementProps {
  formValues: Record<string, any>;
  generatorName: string;
}

export class FillGenerateUIPrompt extends PromptElement<FillGenerateUIPromptProps> {
  override render(
    state: void,
    sizing: PromptSizing,
    progress?: Progress<ChatResponsePart>,
    token?: CancellationToken,
  ): Promise<PromptPiece | undefined> | PromptPiece | undefined {
    return (
      <UserMessage priority={100}>
        You are an AI assistant specialized in Nx workspaces and monorepo
        development. You provide precise, technical guidance for developers
        working with Nx tools, patterns, and best practices. Use the provided
        tools available to you to answer the users query. YOU HAVE ONE JOB AND
        ONE JOB ONLY: PROVIDE A JSON OBJECT OF FORM VALUES THAT WILL BE USED TO
        FILL THE GENERATE UI IN THE EDITOR. The generate UI is a form that
        allows users to select options for a generator. <br />
        The user is trying to use the {this.props.generatorName} generator.
      </UserMessage>
    );
  }
}
