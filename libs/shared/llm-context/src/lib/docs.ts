import { xhr } from 'request-light';

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type DocsPageSection = {
  heading: string;
  longer_heading: string;
  content: string;
  similarity: number;
};

export async function getDocsContext(
  userQuery: string,
  lastAssistantMessage?: string,
): Promise<DocsPageSection[]> {
  const messages: ChatTurn[] = [];
  if (lastAssistantMessage) {
    messages.push({
      role: 'assistant',
      content: lastAssistantMessage,
    });
  }
  messages.push({
    role: 'user',
    content: userQuery,
  });

  const req = await xhr({
    url: 'https://nx.dev/api/query-ai-embeddings',
    type: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({
      messages,
    }),
  });

  const response = JSON.parse(req.responseText);
  return response.context.pageSections;
}

export function getDocsPrompt(docsPages: DocsPageSection[]): string {
  const pages = docsPages.slice(0, 4);

  if (pages.length === 0) {
    return '';
  }

  const pagesText = pages
    .map(
      (page, index) =>
        `- ${page.longer_heading ?? page.heading ?? index} <br/> ${page.content}`,
    )
    .join('<br/>');

  return `Below are some documentation sections that could be relevant to the user request. Read through them carefully. You don't have to use them to answer the user query, but they might help. Do not assume knowledge about nx, its configuration and options. Instead, base your replies on the provided metadata and these documentation sections. <br /><br />${pagesText}`;
}
