import { getNxJsonPrompt } from '@nx-console/shared-prompts';
import {
  BasePromptElementProps,
  PromptElement,
  UserMessage,
} from '@vscode/prompt-tsx';
import type { NxJsonConfiguration } from 'nx/src/devkit-exports';

interface NxJsonPromptProps extends BasePromptElementProps {
  nxJson: NxJsonConfiguration;
}

export class NxJsonPrompt extends PromptElement<NxJsonPromptProps> {
  render() {
    return (
      <UserMessage priority={50}>
        ${getNxJsonPrompt(this.props.nxJson)}
      </UserMessage>
    );
  }
}
