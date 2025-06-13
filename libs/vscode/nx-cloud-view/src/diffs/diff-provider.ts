import { TextDocumentContentProvider, Uri, CancellationToken } from 'vscode';

export class DiffContentProvider implements TextDocumentContentProvider {
  private static diffContent = new Map<string, string>();

  static setContent(uri: string, content: string): void {
    this.diffContent.set(uri, content);
  }

  static clearContent(uri: string): void {
    this.diffContent.delete(uri);
  }

  async provideTextDocumentContent(
    uri: Uri,
    _: CancellationToken,
  ): Promise<string | undefined> {
    const key = uri.toString();
    return DiffContentProvider.diffContent.get(key);
  }
}

export interface FileDiff {
  fileName: string;
  beforeContent: string;
  afterContent: string;
}

export function parseGitDiff(gitDiff: string): FileDiff[] {
  const lines = gitDiff.split('\n');
  const fileDiffs: FileDiff[] = [];
  let currentFile: Partial<FileDiff> | null = null;
  let beforeContent: string[] = [];
  let afterContent: string[] = [];
  let inHunk = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of new file diff
    if (line.startsWith('diff --git')) {
      // Save the previous file if it exists
      if (currentFile && currentFile.fileName) {
        fileDiffs.push({
          fileName: currentFile.fileName,
          beforeContent: beforeContent.join('\n'),
          afterContent: afterContent.join('\n'),
        });
      }

      // Reset for new file
      currentFile = {};
      beforeContent = [];
      afterContent = [];
      inHunk = false;

      // Extract file name from the diff line if possible
      // Format: diff --git a/path/to/file b/path/to/file
      const matches = line.match(/diff --git a\/(.+) b\/(.+)/);
      if (matches && currentFile) {
        currentFile.fileName = matches[1]; // Use the "a/" path
      }
    }
    // File name detection (more reliable)
    else if (line.startsWith('--- ')) {
      if (line.startsWith('--- a/') && currentFile) {
        currentFile.fileName = line.substring(6);
      } else if (line.startsWith('--- /dev/null')) {
        // New file, name will come from +++ line
      }
    } else if (line.startsWith('+++ ')) {
      if (line.startsWith('+++ b/') && currentFile) {
        // Use this as the file name if we don't have one yet
        if (!currentFile.fileName) {
          currentFile.fileName = line.substring(6);
        }
      } else if (line.startsWith('+++ /dev/null')) {
        // Deleted file, we should already have the name from --- line
      }
    }
    // Hunk header: @@ -start,count +start,count @@
    else if (line.startsWith('@@')) {
      inHunk = true;
    }
    // Content lines within a hunk
    else if (inHunk && currentFile) {
      if (line.startsWith('-')) {
        // Line removed from original
        beforeContent.push(line.substring(1));
      } else if (line.startsWith('+')) {
        // Line added to new version
        afterContent.push(line.substring(1));
      } else if (line.startsWith(' ')) {
        // Context line (present in both versions)
        const contextLine = line.substring(1);
        beforeContent.push(contextLine);
        afterContent.push(contextLine);
      } else if (line === '') {
        // Empty line
        beforeContent.push('');
        afterContent.push('');
      }
    }
  }

  // Add the last file if it exists
  if (currentFile && currentFile.fileName) {
    fileDiffs.push({
      fileName: currentFile.fileName,
      beforeContent: beforeContent.join('\n'),
      afterContent: afterContent.join('\n'),
    });
  }

  return fileDiffs;
}
