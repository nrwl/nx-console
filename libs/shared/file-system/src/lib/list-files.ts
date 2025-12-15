import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import * as path from 'path';
import ignore, { Ignore } from 'ignore';

export function listFiles(dirName: string): string[] {
  const ig = ignore();
  // default ignores
  ig.add(['node_modules', 'dist']);

  const gitignorePath = path.join(dirName, '.gitignore');
  if (existsSync(gitignorePath)) {
    try {
      ig.add(readFileSync(gitignorePath, 'utf-8'));
    } catch {
      // ignore
    }
  }

  return listFilesRecursive(dirName, ig);
}

function listFilesRecursive(
  dirName: string,
  ig: Ignore,
  parentPath = '',
): string[] {
  const res: string[] = [];
  // the try-catch here is intentional. It's only used in auto-completion.
  // If it doesn't work, we don't want the process to exit
  try {
    readdirSync(dirName).forEach((c) => {
      const relativePath = parentPath ? `${parentPath}/${c}` : c;
      if (ig.ignores(relativePath)) {
        return;
      }

      const child = path.join(dirName, c);
      const isDirectory = statSync(child).isDirectory();
      try {
        if (!isDirectory) {
          res.push(child);
        } else {
          res.push(...listFilesRecursive(child, ig, relativePath));
        }
      } catch {
        // noop
      }
    });
  } catch {
    // noop
  }
  return res;
}
