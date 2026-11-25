import { getLanguageService, TextDocument } from 'vscode-json-languageservice';
import { CompletionType } from './completion-type';
import { getNxJsonSchema } from './nx-json-schema';

it.each(['{"plugin": "|"}', '"|"'])(
  'marks plugin names for inference completion in %s',
  async (entry) => {
    const schema = await getNxJsonSchema(
      [],
      {},
      { major: 24, minor: 0, full: '24.0.6' },
      '/missing-workspace',
    );
    const text = `{"plugins": [${entry}]}`;
    const offset = text.indexOf('|');
    const document = TextDocument.create(
      'file:///nx.json',
      'json',
      0,
      text.replace(/\|/g, ''),
    );
    const service = getLanguageService({});
    const matches = await service.getMatchingSchemas(
      document,
      service.parseJSONDocument(document),
      schema,
    );
    expect(
      matches.some(
        (match) =>
          match.node.offset <= offset &&
          offset <= match.node.offset + match.node.length &&
          match.schema['x-completion-type'] === CompletionType.inferencePlugins,
      ),
    ).toBe(true);
  },
);
