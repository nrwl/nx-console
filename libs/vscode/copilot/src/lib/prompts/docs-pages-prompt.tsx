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
    const pages = this.props.docsPages.slice(0, 4);
    return (
      <>
        {pages.length > 0 ? (
          <UserMessage priority={30}>
            Below are some documentation sections that could be relevant to the
            user request. Read through them carefully. You don't have to use
            them to answer the user query, but they might help. Do not assume
            knowledge about nx, its configuration and options. Instead, base
            your replies on the provided metadata and these documentation
            sections. <br />
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
