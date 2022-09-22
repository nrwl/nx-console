/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// https://github.com/microsoft/vscode/blob/89c30e1b86f941db095d9f52b128287e5039e004/extensions/json-language-features/server/src/languageModelCache.ts

import { JSONDocument } from 'vscode-json-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getJsonLanguageService } from './json-language-service';

export interface LanguageModelCache<T> {
  retrieve(
    document: TextDocument,
    stripSchema?: boolean
  ): { jsonAst: T; document: TextDocument };
  onDocumentRemoved(document: TextDocument): void;
  dispose(): void;
}

const parse = (document: TextDocument): JSONDocument | undefined =>
  getJsonLanguageService()?.parseJSONDocument(document);

let languageModels: {
  [uri: string]: {
    version: number;
    languageId: string;
    cTime: number;
    languageModel: JSONDocument;
    document: TextDocument;
  };
} = {};
const maxEntries = 10;
const cleanupIntervalTimeInSec = 60;
let nModels = 0;

let cleanupInterval: NodeJS.Timer | undefined = undefined;
if (cleanupIntervalTimeInSec > 0) {
  cleanupInterval = setInterval(() => {
    const cutoffTime = Date.now() - cleanupIntervalTimeInSec * 1000;
    const uris = Object.keys(languageModels);
    for (const uri of uris) {
      const languageModelInfo = languageModels[uri];
      if (languageModelInfo.cTime < cutoffTime) {
        delete languageModels[uri];
        nModels--;
      }
    }
  }, cleanupIntervalTimeInSec * 1000);
}

export function getLanguageModelCache(): LanguageModelCache<JSONDocument> {
  return {
    retrieve(
      document: TextDocument,
      stripSchema = true
    ): {
      jsonAst: JSONDocument;
      document: TextDocument;
    } {
      const version = document.version;
      const languageId = document.languageId;
      const languageModelInfo = languageModels[document.uri];
      if (
        languageModelInfo &&
        languageModelInfo.version === version &&
        languageModelInfo.languageId === languageId
      ) {
        languageModelInfo.cTime = Date.now();
        return {
          jsonAst: languageModelInfo.languageModel,
          document: languageModelInfo.document,
        };
      }

      if (stripSchema) {
        document = TextDocument.create(
          document.uri,
          document.languageId,
          document.version,
          document.getText().replace(/"\$schema":\s".+",/, '')
        );
      }

      const languageModel = parse(document);

      if (!languageModel) {
        return {
          jsonAst: {
            root: undefined,
            getNodeFromOffset() {
              return undefined;
            },
          },
          document,
        };
      }

      languageModels[document.uri] = {
        languageModel,
        version,
        languageId,
        document,
        cTime: Date.now(),
      };
      if (!languageModelInfo) {
        nModels++;
      }

      if (nModels === maxEntries) {
        let oldestTime = Number.MAX_VALUE;
        let oldestUri = null;
        for (const uri in languageModels) {
          const languageModelInfo = languageModels[uri];
          if (languageModelInfo.cTime < oldestTime) {
            oldestUri = uri;
            oldestTime = languageModelInfo.cTime;
          }
        }
        if (oldestUri) {
          delete languageModels[oldestUri];
          nModels--;
        }
      }
      return { jsonAst: languageModel, document };
    },
    onDocumentRemoved(document: TextDocument) {
      const uri = document.uri;
      if (languageModels[uri]) {
        delete languageModels[uri];
        nModels--;
      }
    },
    dispose() {
      if (typeof cleanupInterval !== 'undefined') {
        clearInterval(cleanupInterval);
        cleanupInterval = undefined;
        languageModels = {};
        nModels = 0;
      }
    },
  };
}
