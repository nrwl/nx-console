import { readdirSync, statSync } from 'fs';
import * as path from 'path';

export function listFiles(dirName: string): string[] {
  // TODO use .gitignore to skip files
  if (dirName.indexOf('node_modules') > -1) return [];
  if (dirName.indexOf('dist') > -1) return [];

  const res: string[] = [];
  // the try-catch here is intentional. It's only used in auto-completion.
  // If it doesn't work, we don't want the process to exit
  try {
    readdirSync(dirName).forEach((c) => {
      const child = path.join(dirName, c);
      const isDirectory = statSync(child).isDirectory();
      try {
        if (!isDirectory) {
          res.push(child);
        } else {
          res.push(...listFiles(child));
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
