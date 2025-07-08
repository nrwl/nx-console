import * as path from 'path';
import { Logger } from '@nx-console/shared-utils';
import { readFileSync, existsSync } from 'fs';
import { parse as parseJson, ParseError } from 'jsonc-parser';

export async function readAndParseJson(filePath: string) {
  const content = readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(content);
  } catch {
    const errors: ParseError[] = [];
    const result = parseJson(content, errors);
    return result;
  }
}

export async function readJsonFile(
  filePath: string | undefined,
  basedir = '',
  logger?: Logger,
): Promise<{ path: string; json: any }> {
  if (!filePath) {
    return {
      path: '',
      json: {},
    };
  }

  let fullFilePath = basedir ? path.join(basedir, filePath) : filePath;
  if (fullFilePath.startsWith('file:\\')) {
    fullFilePath = fullFilePath.replace('file:\\', '');
  }
  if (fullFilePath.startsWith('file://')) {
    fullFilePath = fullFilePath.replace('file://', '');
  }

  if (process.platform === 'win32' && fullFilePath.match(/^\/[a-zA-Z]:\//)) {
    fullFilePath = fullFilePath.substring(1);
  }

  try {
    if (existsSync(fullFilePath)) {
      const json = await readAndParseJson(fullFilePath);
      return {
        path: fullFilePath,
        json,
      };
    }
  } catch (e) {
    logger?.log(`${fullFilePath} does not exist`);
  }

  return {
    path: fullFilePath,
    json: {},
  };
}
