import { FormValues } from '@nx-console/shared-generate-ui-types';
import {
  BasePromptElementProps,
  PromptElement,
  PromptPiece,
  PromptSizing,
  UserMessage,
} from '@vscode/prompt-tsx';
import { ChatResponsePart } from '@vscode/prompt-tsx/dist/base/vscodeTypes';
import { Progress, CancellationToken } from 'vscode';
import { NxCopilotPromptProps } from './prompt';
import { DocsPagesPrompt } from './docs-pages-prompt';
export interface FillGenerateUIPromptProps extends NxCopilotPromptProps {
  formValues: FormValues;
  generatorName: string;
  generatorSchema: any;
}

export class FillGenerateUIPrompt extends PromptElement<FillGenerateUIPromptProps> {
  override render(
    state: void,
    sizing: PromptSizing,
    progress?: Progress<ChatResponsePart>,
    token?: CancellationToken,
  ): Promise<PromptPiece | undefined> | PromptPiece | undefined {
    return (
      <>
        <UserMessage priority={100}>
          You are an AI assistant specialized in Nx workspaces and monorepo
          development. You provide precise, technical guidance for developers
          working with Nx tools, patterns, and best practices. Use the provided
          tools available to you to answer the users query.
          <br /> YOU HAVE ONE JOB AND ONE JOB ONLY: PROVIDE A JSON OBJECT OF
          FORM VALUES THAT WILL BE USED TO FILL THE GENERATE UI IN THE EDITOR.
          The generate UI is a form that allows users to select options for a
          generator. Output nothing but the changes in a JSON code block. <br />
          The user is trying to use the {this.props.generatorName} generator.
          <br />
          The current form values are: {JSON.stringify(this.props.formValues)}
          <br />
          You can make changes to them or overwrite them but leave those that
          aren't relevant to the query the same. ONLY USE VALUES THAT CONFORM TO
          THE SCHEMA BELOW.
          <></>
          If you're generating a library, app or component, you can specify the
          parent directory via the cwd option. Don't use the directory option to
          specify this, ALWAYS specify the cwd with a cwd option even if it's
          not in the schema. If there is a name and a directory option, use the
          directory option to specify what the library should be called / what
          directory it should be placed in. This is not the parent directory but
          the library itself.
          <></>
        </UserMessage>
        <UserMessage priority={80}>
          This is the schema for the generator:{' '}
          {JSON.stringify(this.props.generatorSchema)}
        </UserMessage>
        <DocsPagesPrompt
          docsPages={this.props.docsPages}
          flexGrow={5}
          passPriority
        />
        <UserMessage priority={90}>{this.props.userQuery}</UserMessage>
      </>
    );
  }
}
