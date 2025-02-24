import { DocsPageSection, getDocsPrompt } from '@nx-console/shared-llm-context';
import {
  PromptElement,
  UserMessage,
  BasePromptElementProps,
} from '@vscode/prompt-tsx';

interface DocsPagesPromptProps extends BasePromptElementProps {
  docsPages: DocsPageSection[];
  passPriority: true;
}

export class DocsPagesPrompt extends PromptElement<DocsPagesPromptProps> {
  override render() {
    return (
      <UserMessage priority={30}>
        {getDocsPrompt(this.props.docsPages)}
      </UserMessage>
    );
  }
}
