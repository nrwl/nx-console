import { readJsonFile } from '../utils';
import {
  SUPPORTED_NG_BUILD_BUILDERS,
  SUPPORTED_KARMA_TEST_BUILDERS,
  getProjectArchitect
} from '../architect-utils';
import { join } from 'path';

export enum StatusType {
  BUILD = 'build',
  TEST = 'test'
}

export function createDetailedStatusCalculator(cwd: string, cmds: string[]) {
  const operationName = cmds[0];
  const project = cmds[1];
  const { json: angularJson } = readJsonFile('./angular.json', cwd);
  const architect = getProjectArchitect(project, operationName, angularJson);
  const builder = architect.builder;

  if (SUPPORTED_KARMA_TEST_BUILDERS.includes(builder)) {
    return new TestDetailedStatusCalculator();
  }

  if (SUPPORTED_NG_BUILD_BUILDERS.includes(builder)) {
    const isForProduction = cmds.includes('--configuration=production');
    const options = architect.options;
    return new BuildDetailedStatusCalculator({
      isForProduction,
      architectOptions: options,
      cwd
    });
  }

  return new EmptyDetailedStatusCalculator();
}

export interface DetailedStatusCalculator<T> {
  detailedStatus: T;
  addOut(value: string): void;
  setStatus(value: 'successful' | 'failed' | 'terminated'): void;
  reset(): void;
}

class EmptyDetailedStatusCalculator implements DetailedStatusCalculator<null> {
  detailedStatus = null;
  addOut(value: string) {}
  setStatus(value: 'successful' | 'failed' | 'terminated') {}
  reset() {}
}

export interface Chunk {
  name: string;
  file: string;
  size: string;
  type: string;
}

export interface BuildDetailedStatus {
  type: StatusType.BUILD;
  buildStatus:
    | 'build_pending'
    | 'build_inprogress'
    | 'build_success'
    | 'build_failure';
  progress: number;
  date: string;
  time: string;
  chunks: Chunk[];
  errors: string[];
  serverHost?: string;
  serverPort?: number;
  isForProduction?: boolean;
  outputPath?: string;
  indexFile?: string;
}

interface BuildArchitectOpts {
  outputPath: string;
  index: string;
  main: string;
  polyfills: string;
  tsConfig: string;
  assets: string[];
}

export class BuildDetailedStatusCalculator
  implements DetailedStatusCalculator<BuildDetailedStatus> {
  detailedStatus: BuildDetailedStatus;
  chunks: { [k: string]: Chunk } = {};
  isForProduction: boolean;
  architectOptions: null | BuildArchitectOpts;
  cwd: string;

  constructor(opts: {
    isForProduction: boolean;
    architectOptions: null | BuildArchitectOpts;
    cwd: string;
  }) {
    this.isForProduction = opts.isForProduction;
    this.architectOptions = opts.architectOptions;
    this.cwd = opts.cwd;
    this.reset();
  }

  reset() {
    const outputPath =
      this.architectOptions && this.architectOptions.outputPath
        ? join(this.cwd, this.architectOptions.outputPath)
        : undefined;
    const indexFile =
      this.architectOptions && this.architectOptions.index
        ? join(this.cwd, this.architectOptions.index)
        : undefined;
    this.detailedStatus = {
      outputPath,
      indexFile,
      type: StatusType.BUILD,
      buildStatus: 'build_inprogress',
      progress: 0,
      date: '',
      time: '',
      chunks: [] as Chunk[],
      errors: [],
      isForProduction: this.isForProduction
    };
  }

  addOut(value: string) {
    const _value = value.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ''
    );
    const parsed = getNextBuildState(
      {
        chunks: this.chunks,
        progress: this.detailedStatus.progress,
        serverHost: this.detailedStatus.serverHost,
        serverPort: this.detailedStatus.serverPort
      },
      _value
    );
    this.chunks = { ...this.chunks, ...parsed.chunks };

    if (value.indexOf('0% compiling') > -1) {
      this.detailedStatus = {
        ...this.detailedStatus,
        progress: 0,
        buildStatus: 'build_inprogress'
      };
    }

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
        chunks: Object.values(this.chunks)
      };
    }
  }

  setStatus(value: 'successful' | 'failed' | 'terminated') {
    this.detailedStatus = {
      ...this.detailedStatus,
      buildStatus: value === 'successful' ? 'build_success' : 'build_failure'
    };
  }
}

interface TestError {
  label: string;
  details: string;
}

type TestStatus =
  | 'test_pending'
  | 'test_building'
  | 'test_inprogress'
  | 'test_failure'
  | 'test_success';

export interface TestDetailedStatus {
  type: StatusType.TEST;
  testStatus: TestStatus;
  buildProgress: number;
  total: number;
  failure: number;
  success: number;
  errors: TestError[];
}

export class TestDetailedStatusCalculator
  implements DetailedStatusCalculator<TestDetailedStatus> {
  detailedStatus: TestDetailedStatus;

  constructor() {
    this.reset();
  }

  reset() {
    this.detailedStatus = {
      type: StatusType.TEST,
      testStatus: 'test_pending',
      buildProgress: 0,
      total: 0,
      failure: 0,
      success: 0,
      errors: []
    };
  }

  addOut(rawValue: string) {
    const value = sanitize(rawValue);

    const buildProgress = getNextProgress(
      this.detailedStatus.buildProgress,
      value
    );

    const errors = getNextTestErrorState(this.detailedStatus.errors, value);

    const { total, failure, success, testStatus } = getNextTestStatusState(
      this.detailedStatus,
      value
    );

    const nextStatus =
      testStatus === 'test_pending' && buildProgress > 0
        ? 'test_building'
        : testStatus;

    this.detailedStatus = {
      type: StatusType.TEST,
      buildProgress,
      errors,
      total,
      failure,
      success,
      testStatus: nextStatus
    };
  }

  setStatus(value: 'successful' | 'failed' | 'terminated') {
    this.detailedStatus = {
      ...this.detailedStatus,
      testStatus: value === 'successful' ? 'test_success' : 'test_failure'
    };
  }
}

function getNextBuildState(
  state: {
    chunks: { [k: string]: Chunk };
    progress: number;
    serverHost?: string;
    serverPort?: number;
  },
  value: string
) {
  const chunks = { ...state.chunks } as any;
  const serverErrorRegExp = /(Port \d+ is already in use)|(getaddrinfo ENOTFOUND .*)/;
  let date = '';
  let time = '';
  let errors = [] as string[];
  let progress = state.progress;

  if (value.indexOf('chunk') > -1 && value.indexOf('Hash:') > -1) {
    value
      .split(/[\n\r]/)
      .map(v => v.trim())
      .forEach(line => {
        const chunkRegExp = /chunk {(\w+)}\s*([\w|.]+)[^)]*\)\s*([^[]*)\[(\w+)/g;
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
      .split(/[\n\r]/)
      .map(v => v.trim())
      .filter(v => v.length > 0);
  }

  const serverErrorMatch = value.match(serverErrorRegExp);
  if (serverErrorMatch) {
    errors.push(serverErrorMatch[0]);
  }

  progress = getNextProgress(progress, value);

  const serverRegExp = /listening on (.+?):(\d+)/;
  const serverMatch = value.match(serverRegExp);

  return {
    chunks,
    date,
    time,
    errors,
    progress,
    serverHost: serverMatch ? serverMatch[1] : state.serverHost,
    serverPort: serverMatch ? Number(serverMatch[2]) : state.serverPort
  };
}

const COLOR_OUTPUT_REGEXP = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

function sanitize(value: string) {
  return value.replace(COLOR_OUTPUT_REGEXP, '');
}

const PROGRESS_REGEXP = /\d{1,2}%/g;

function getNextProgress(curr: number, value: string): number {
  const progressMatch = value.match(PROGRESS_REGEXP);
  if (isFinishedProcessingChunks(value)) {
    return 100;
  } else if (progressMatch) {
    const lastBit = progressMatch[progressMatch.length - 1];
    const p = Number(lastBit.substr(0, lastBit.length - 1));
    return Math.max(curr, p);
  } else {
    return curr;
  }
}

function isFinishedProcessingChunks(value: string) {
  return (
    value.indexOf('Connected on socket') > -1 ||
    (value.indexOf('chunk') > -1 && value.indexOf('Hash:') > -1)
  );
}

interface TestState {
  total: number;
  failure: number;
  success: number;
  testStatus: TestStatus;
}

const TEST_PROGRESS_REGEXP = /Executed\s+(\d+)\s+of\s+(\d+)\s+SUCCESS\s+(\((\d+)\s+FAILED\))?/;
const TEST_RESULT_REGEXP = /TOTAL:\s+((\d+)\s+FAILED,\s+)?(\d+)\s+SUCCESS/;

function getNextTestStatusState(s: TestState, value: string): TestState {
  let match;
  if ((match = value.match(TEST_RESULT_REGEXP))) {
    const failure = Number(match[2] || 0);
    const success = Number(match[3]);
    const total = failure + success;
    return {
      total: total,
      testStatus: failure > 0 ? 'test_failure' : 'test_success',
      failure,
      success
    };
  } else if ((match = value.match(TEST_PROGRESS_REGEXP))) {
    const total = Number(match[2]);
    const success = Number(match[1]);
    const failure = Number(match[4] || 0);
    return {
      total: total,
      testStatus: 'test_inprogress',
      failure,
      success
    };
  } else {
    return s;
  }
}

function getNextTestErrorState(_buffer: TestError[], value: string) {
  const newCaseRegExp = /^\s*[^()]+\([^)]+\)+(.+) FAILED\s*$/;
  const errorRegExp = /^\s+((Expected .+)|( {2}at .+))$/;

  let buffer = _buffer;

  if (value.indexOf('Connected on socket') > -1) {
    buffer = [];
  }

  const lines = value.split(/[\r\n]/);

  lines.forEach(line => {
    let match;
    if ((match = line.match(newCaseRegExp))) {
      const label = match[1].trim();
      if (buffer.every(b => b.label !== label)) {
        buffer = [...buffer, { label, details: '' }];
      }
    } else if ((match = line.match(errorRegExp))) {
      const [last, ...rest] = buffer.reverse();
      if (last) {
        buffer = [
          ...rest,
          { ...last, details: `${last.details}${match[1]}\n` }
        ];
      }
    }
  });

  return buffer;
}
