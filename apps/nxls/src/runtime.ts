import {
  xhr,
  XHRResponse,
  configure as configureHttpRequests,
  getErrorStatusDescription,
} from 'request-light';
import { URI } from 'vscode-uri';
import * as fs from 'fs';

export interface RequestService {
  getContent(uri: string): Promise<string>;
}

function getHTTPRequestService(): RequestService {
  return {
    getContent(uri: string, _encoding?: string) {
      const headers = { 'Accept-Encoding': 'gzip, deflate' };
      return xhr({ url: uri, followRedirects: 5, headers }).then(
        (response) => {
          return response.responseText;
        },
        (error: XHRResponse) => {
          return Promise.reject(
            error.responseText ||
              getErrorStatusDescription(error.status) ||
              error.toString()
          );
        }
      );
    },
  };
}

function getFileRequestService(): RequestService {
  return {
    getContent(location: string, encoding?: BufferEncoding) {
      return new Promise((c, e) => {
        const uri = URI.parse(location);
        fs.readFile(uri.fsPath, encoding, (err, buf) => {
          if (err) {
            return e(err);
          }
          c(buf.toString());
        });
      });
    },
  };
}

export function getSchemaRequestService(
  handledSchemas: string[] = ['https', 'http', 'file']
) {
  const builtInHandlers: { [protocol: string]: RequestService | undefined } =
    {};
  for (const protocol of handledSchemas) {
    if (protocol === 'file') {
      builtInHandlers[protocol] = getFileRequestService();
    } else if (protocol === 'http' || protocol === 'https') {
      builtInHandlers[protocol] = getHTTPRequestService();
    }
  }
  return (uri: string): Thenable<string> => {
    const protocol = uri.substr(0, uri.indexOf(':'));

    const builtInHandler = builtInHandlers[protocol];
    if (builtInHandler) {
      return builtInHandler.getContent(uri);
    }
    return Promise.reject('Unable to retrieve schema');
  };
}
