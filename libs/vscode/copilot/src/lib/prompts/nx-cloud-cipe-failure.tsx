import { getGitDiffs, GitExtension } from '@nx-console/vscode-utils';
import { FilesContext, IFilesToInclude } from '@vscode/chat-extension-utils';
import {
  BasePromptElementProps,
  PromptElement,
  UserMessage,
  AssistantMessage,
  TextChunk,
} from '@vscode/prompt-tsx';
import { extensions, Position, Range, Uri } from 'vscode';

interface NxCloudCipeFailurePromptProps extends BasePromptElementProps {
  workspaceRoot: string;
  terminalOutput: string;
  baseSha?: string;
  headSha?: string;
}

export class NxCloudCipeFailurePrompt extends PromptElement<NxCloudCipeFailurePromptProps> {
  render() {
    return (
      <>
        <AssistantMessage>
          You are an assistant to developers to help with errors in the
          terminal. You will be given the terminal output of a failed CI
          pipeline execution. You will also be given affected files, and their
          git changes.
        </AssistantMessage>
        <UserMessage>
          <TextChunk flexBasis={2}>
            The terminal output of the CI pipeline execution that failed is:{' '}
            {this.props.terminalOutput}.
          </TextChunk>
          <AffectedFilesOrShaPrompt
            workspaceRoot={this.props.workspaceRoot}
            baseSha={this.props.baseSha}
            headSha={this.props.headSha}
          />
          Please help me understand the error in the terminal output, and how
          the file changes affected the run to cause the failure.
        </UserMessage>
      </>
    );
  }
}

interface AffectedFilesOrShaPromptProps extends BasePromptElementProps {
  workspaceRoot: string;
  baseSha?: string;
  headSha?: string;
}

export class AffectedFilesOrShaPrompt extends PromptElement<AffectedFilesOrShaPromptProps> {
  async render() {
    const changedFiles = await getGitDiffs(
      this.props.workspaceRoot,
      this.props.baseSha,
      this.props.headSha,
    );

    if (!changedFiles) {
      return null;
    }

    return (
      <>
        <FilesContext
          files={changedFiles.map((fileDiff) => ({
            value: Uri.file(fileDiff.path),
          }))}
          flexBasis={2}
        />
        <>
          {changedFiles.map((fileDiff) => {
            return (
              <TextChunk>
                git diff for: {fileDiff.path}
                <br />
                {fileDiff.diffContent}
              </TextChunk>
            );
          })}
        </>
      </>
    );
  }
}
