export interface DetailedStatusCalculator<T> {
  addOut(value: string): void;
  setStatus(value: string): void;
  detailedStatus: T;
}

class EmptyDetailedStatusCalculator implements DetailedStatusCalculator<null> {
  addOut(value: string) {}
  setStatus(value: string) {}
  detailedStatus = null;
}

export type Chunk = { name: string; file: string; size: string; type: string };

export type BuildDetailedStatus = {
  watchStatus: 'inprogress' | 'success' | 'failure';
  date: string;
  time: string;
  chunks: Chunk[];
  errors: string[];
};

export class BuildDetailedStatusCalculator
  implements DetailedStatusCalculator<null | BuildDetailedStatus> {
  detailedStatus: BuildDetailedStatus = {
    watchStatus: 'success',
    date: '',
    time: '',
    chunks: [] as Chunk[],
    errors: []
  };

  chunks: { [k: string]: Chunk } = {};

  addOut(value: string) {
    value = value.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    );

    const parsed = this.parse(value);
    if (Object.keys(parsed.chunks).length > 0) {
      this.chunks = parsed.chunks;
    }

    if (value.indexOf('ERROR in') > -1) {
      this.detailedStatus = {
        watchStatus: 'failure',
        ...parsed,
        chunks: Object.values(parsed.chunks)
      };
    } else if (value.indexOf('chunk') > -1 && value.indexOf('Hash:') > -1) {
      this.detailedStatus = {
        watchStatus: 'success',
        ...parsed,
        chunks: Object.values(parsed.chunks)
      };
    } else {
      this.detailedStatus = {
        ...this.detailedStatus,
        watchStatus: 'inprogress'
      };
    }
  }

  setStatus(value: 'success' | 'failure') {
    this.detailedStatus = { ...this.detailedStatus, watchStatus: value };
  }

  private parse(value: string) {
    const chunks = { ...this.chunks } as any;
    let date = '';
    let time = '';
    let errors = [] as string[];

    if (value.indexOf('chunk') > -1 && value.indexOf('Hash:') > -1) {
      value
        .split('\n')
        .map(v => v.trim())
        .forEach(line => {
          const chunkRegExp = /chunk \{(\w+)\}\s*([\w|\.]+)[^\)]*\)\s*([^\[]*)\[(\w+)/g;
          const chunkMatch = chunkRegExp.exec(line);
          if (chunkMatch) {
            chunks[chunkMatch[1]] = {
              name: chunkMatch[1],
              file: chunkMatch[2],
              size: chunkMatch[3].trim(),
              type: chunkMatch[4]
            };
          }

          const dateRegExp = /Date: ([^\s)]+)/g;
          const dateMatch = dateRegExp.exec(line);
          if (dateMatch) {
            date = dateMatch[1];
          }

          const timeRegExp = /Time: ([^\s)]+)/g;
          const timeMatch = timeRegExp.exec(line);
          if (timeMatch) {
            time = timeMatch[1];
          }
        });
    }

    if (value.indexOf('ERROR in') > -1) {
      errors = value
        .substring(value.indexOf('ERROR in') + 8)
        .split('\n')
        .map(v => v.trim())
        .filter(v => v.length > 0);
    }

    return { chunks, date, time, errors };
  }
}

export function createDetailedStatusCalculator(operationName: string) {
  switch (operationName) {
    case 'build':
      return new BuildDetailedStatusCalculator();

    default:
      return new EmptyDetailedStatusCalculator();
  }
}
