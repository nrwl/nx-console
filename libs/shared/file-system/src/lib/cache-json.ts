import * as path from 'path';
import { PosixFS, ZipOpenFS } from '@yarnpkg/fslib';
import { getLibzipSync as libzip } from '@yarnpkg/libzip';

import { parse as parseJson, ParseError } from 'jsonc-parser';

const zipOpenFs = new ZipOpenFS({ libzip });
export const crossFs = new PosixFS(zipOpenFs);
export const files: { [path: string]: string[] } = {};
export const fileContents: { [path: string]: any } = {};

export async function readAndParseJson(filePath: string) {
  const content = await crossFs.readFilePromise(filePath, 'utf8');
  try {
    return JSON.parse(content);
  } catch {
    const errors: ParseError[] = [];
    const result = parseJson(content, errors);

    if (errors.length > 0) {
      for (const { error, offset } of errors) {
        // TODO(cammisuli): output this generically
        // getOutputChannel().appendLine(
        //   `${printParseErrorCode(
        //     error
        //   )} in JSON at position ${offset} in ${filePath}`
        // );
      }
    }

    return result;
  }
}

export function clearJsonCache(filePath: string, basedir = '') {
  const fullFilePath = path.join(basedir, filePath);
  return delete fileContents[fullFilePath];
}

export async function readAndCacheJsonFile(
  filePath: string | undefined,
  basedir = ''
): Promise<{ path: string; json: any }> {
  if (!filePath) {
    return {
      path: '',
      json: {},
    };
  }
  let fullFilePath = path.join(basedir, filePath);
  if (fullFilePath.startsWith('file:\\')) {
    fullFilePath = fullFilePath.replace('file:\\', '');
  }
  try {
    const stats = await crossFs.statPromise(fullFilePath);
    if (fileContents[fullFilePath] || stats.isFile()) {
      fileContents[fullFilePath] ||= await readAndParseJson(fullFilePath);
      return {
        path: fullFilePath,
        json: fileContents[fullFilePath],
      };
    }
  } catch (e) {
    // TODO(cammisuli): output this generically
    // getOutputChannel().appendLine(`${fullFilePath} does not exist`);
  }

  return {
    path: fullFilePath,
    json: {},
  };
}

/**
 * Caches already created json contents to a file path
 */
export function cacheJson(filePath: string, basedir = '', content?: any) {
  const fullFilePath = path.join(basedir, filePath);
  if (fileContents[fullFilePath]) {
    return {
      json: fileContents[fullFilePath],
      path: fullFilePath,
    };
  }

  if (content) {
    fileContents[fullFilePath] = content;
  }
  return {
    json: content,
    path: fullFilePath,
  };
}
