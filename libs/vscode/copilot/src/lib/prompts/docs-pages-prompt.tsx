import {
  PromptElement,
  UserMessage,
  BasePromptElementProps,
} from '@vscode/prompt-tsx';
import { DocsPageSection } from '../context';

interface DocsPagesPromptProps extends BasePromptElementProps {
  docsPages: DocsPageSection[];
  passPriority: true;
}

export class DocsPagesPrompt extends PromptElement<DocsPagesPromptProps> {
  override render() {
    const pages = this.props.docsPages.slice(0, 3);
    return (
      <>
        {pages.length > 0 ? (
          <UserMessage priority={30}>
            Below are some documentation sections that could be relevant to the
            user request. Read through them carefully. You don't have to use
            them to answer the user query, but they might help.
            <br />
            {pages
              .map(
                (page, index) =>
                  `- ${page.longer_heading ?? page.heading ?? index} <br/> ${
                    page.content
                  }`
              )
              .join('<br/>')}
          </UserMessage>
        ) : (
          <UserMessage></UserMessage>
        )}
      </>
    );
  }
}
