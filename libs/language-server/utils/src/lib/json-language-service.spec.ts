import { TextDocument } from 'vscode-json-languageservice';
import {
  configureJsonLanguageService,
  getJsonLanguageService,
} from './json-language-service';

describe('JSON schema hover descriptions', () => {
  it('preserves literal angle brackets, line breaks, and indentation', async () => {
    configureJsonLanguageService(
      {},
      {
        schemas: [
          {
            uri: 'test://project-schema',
            fileMatch: ['*.json'],
            schema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description:
                    'Run <target> with arguments.\n  nx run app:build [options]',
                },
              },
            },
          },
        ],
      },
    );
    const service = getJsonLanguageService()!;
    const document = TextDocument.create(
      'file:///workspace/project.json',
      'json',
      1,
      '{"command":"build"}',
    );

    const hover = await service.doHover(
      document,
      { line: 0, character: 3 },
      service.parseJSONDocument(document),
    );

    expect(hover?.contents).toEqual([
      'Run \\<target\\> with arguments\\.\\\n&nbsp;&nbsp;nx run app:build \\[options\\]',
    ]);
  });
});
