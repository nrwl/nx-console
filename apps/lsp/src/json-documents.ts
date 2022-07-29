import { JSONDocument, TextDocument } from 'vscode-json-languageservice';

const cache = new Map<string, JSONDocument>();

export function jsonDocumentsMapper(
  parse: (document: TextDocument) => JSONDocument
) {
  return {
    get(document: TextDocument): JSONDocument {
      let jsonDocument = cache.get(document.uri);
      if (jsonDocument) {
        return jsonDocument;
      }

      jsonDocument = parse(document);
      cache.set(document.uri, jsonDocument);

      return jsonDocument;
    },
    remove(document: TextDocument) {
      cache.delete(document.uri);
    },
  };
}
