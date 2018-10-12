export function createDetailedStatusCalculator(operationName: string) {
  switch (operationName) {
    case 'build':
      return new BuildDetailedStatusCalculator();

    case 'serve':
      return new BuildDetailedStatusCalculator();

    default:
      return new EmptyDetailedStatusCalculator();
  }
}

export interface DetailedStatusCalculator<T> {
  addOut(value: string): void;
  setStatus(value: 'success' | 'failure' | 'terminated'): void;
  detailedStatus: T;
}

class EmptyDetailedStatusCalculator implements DetailedStatusCalculator<null> {
  addOut(value: string) {}
  setStatus(value: 'success' | 'failure' | 'terminated') {}
  detailedStatus = null;
}

export interface Chunk {
  name: string;
  file: string;
  size: string;
  type: string;
}

export interface BuildDetailedStatus {
  buildStatus: 'build_inprogress' | 'build_success' | 'build_failure';
  progress: number;
  date: string;
  time: string;
  chunks: Chunk[];
  errors: string[];
  serverHost?: string;
  serverPort?: number;
}

export class BuildDetailedStatusCalculator
  implements DetailedStatusCalculator<null | BuildDetailedStatus> {
  detailedStatus: BuildDetailedStatus = {
    buildStatus: 'build_inprogress',
    progress: 0,
    date: '',
    time: '',
    chunks: [] as Chunk[],
    errors: []
  };

  chunks: { [k: string]: Chunk } = {};

  addOut(value: string) {
    const _value = value.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    );
    const parsed = parseBuildState(_value);
    this.chunks = { ...this.chunks, ...parsed.chunks };
    if (parsed.errors && parsed.errors.length > 0) {
      this.detailedStatus = {
        ...this.detailedStatus,
        ...parsed,
        buildStatus: 'build_failure',
        progress: 100, // override progress
        chunks: Object.values(this.chunks)
      };
    } else if (_value.indexOf('chunk') > -1 && _value.indexOf('Hash:') > -1) {
      this.detailedStatus = {
        ...this.detailedStatus,
        ...parsed,
        buildStatus:
          this.detailedStatus.buildStatus !== 'build_failure'
            ? 'build_success'
            : this.detailedStatus.buildStatus,
        progress: 100,
        chunks: Object.values(this.chunks)
      };
    } else {
      this.detailedStatus = {
        ...this.detailedStatus,
        ...parsed,
        buildStatus: 'build_inprogress',
        chunks: Object.values(this.chunks)
      };
    }
  }

  setStatus(value: 'success' | 'failure' | 'terminated') {
    this.detailedStatus = {
      ...this.detailedStatus,
      buildStatus: value === 'success' ? 'build_success' : 'build_failure'
    };
  }
}

function parseBuildState(value: string) {
  const chunks = {} as any;
  let date;
  let time;
  let errors;
  let progress;

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

  const progressRegExp = /\d{1,2}%/g;
  const progressMatch = value.match(progressRegExp);
  if (progressMatch) {
    const lastBit = progressMatch[progressMatch.length - 1];
    progress = Number(lastBit.substr(0, lastBit.length - 1));
  }

  const serverRegExp = /listening on (.+?):(\d+)/;
  const serverMatch = value.match(serverRegExp);

  const res = {} as any;
  if (chunks) res.chunks = chunks;
  if (date) res.date = date;
  if (time) res.time = time;
  if (errors) res.errors = errors;
  if (progress) res.progress = progress;
  if (serverMatch) {
    res.serverHost = serverMatch[1];
    res.serverPort = Number(serverMatch[2]);
  }
  return res;
}
