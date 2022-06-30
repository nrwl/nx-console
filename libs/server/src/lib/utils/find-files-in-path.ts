import { join } from 'path';
import * as vscode from 'vscode';

export type FileWithDirectory = {
  directory: string;
  file: string;
};

async function findInNestedDirectories(
  filesWithDirectory: FileWithDirectory[],
  pathToCheck: string
): Promise<void> {
  const libUri = vscode.Uri.parse(pathToCheck);
  try {
    for await (const fileResult of await vscode.workspace.fs.readDirectory(
      libUri
    )) {
      if (fileResult[1] === vscode.FileType.Directory) {
        await findInNestedDirectories(
          filesWithDirectory,
          join(pathToCheck, fileResult[0])
        );
      }
      if (fileResult[1] === vscode.FileType.File) {
        filesWithDirectory.push({
          file: join(pathToCheck, fileResult[0]),
          directory: pathToCheck,
        });
      }
    }
  } catch (err) {
    console.warn('ts path not found directory on', libUri);
  }
}

export async function findFilesInPath(
  pathWithAsterix: string
): Promise<FileWithDirectory[]> {
  const libPath = pathWithAsterix.replace('/*', '');
  const filesWithDirectory: FileWithDirectory[] = [];
  await findInNestedDirectories(filesWithDirectory, libPath);
  return filesWithDirectory;
}
