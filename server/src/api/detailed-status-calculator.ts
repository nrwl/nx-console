import { readJsonFile } from '../utils';
import {
  getProjectArchitect,
  SUPPORTED_KARMA_TEST_BUILDERS,
  SUPPORTED_NG_BUILD_BUILDERS
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
  processedChunks: { [k: string]: Chunk } = {};
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

    const {
      processedChunks,
      ...newValue
    } = BuildDetailedStatusCalculator.updateDetailedStatus(
      {
        ...this.detailedStatus,
        processedChunks: this.processedChunks
      },
      _value
    );

    if (this.processedChunks !== processedChunks) {
      newValue.chunks = Object.values(processedChunks);
      this.processedChunks = processedChunks;
    }

    this.detailedStatus = newValue;
  }

  setStatus(value: 'successful' | 'failed' | 'terminated') {
    this.detailedStatus = {
      ...this.detailedStatus,
      buildStatus: value === 'failed' ? 'build_failure' : 'build_success'
    };
  }

  static updateDetailedStatus(
    state: BuildDetailedStatus & { processedChunks: { [k: string]: Chunk } },
    value: string
  ): BuildDetailedStatus & { processedChunks: { [k: string]: Chunk } } {
    const serverErrorRegExp = /(Port \d+ is already in use)|(getaddrinfo ENOTFOUND .*)/;
    const newErrors = [] as string[];
    let _state = state;
    let processedChunks = _state.processedChunks as any;
    let date = '';
    let time = '';
    let progress = _state.progress;
    let buildStatus = _state.buildStatus;

    if (value.indexOf('0% compiling') > -1) {
      progress = 0;
      buildStatus = 'build_inprogress';
      _state = { ..._state, errors: [] };
    } else if (value.indexOf('10% building modules') > -1) {
      progress = 10;
      buildStatus = 'build_inprogress';
      _state = { ..._state, errors: [] };
    }

    progress = getNextProgress(progress, value);

    if (value.indexOf('chunk') > -1 && value.indexOf('Hash:') > -1) {
      buildStatus =
        buildStatus !== 'build_failure' ? 'build_success' : 'build_failure';
      progress = 100;
      value
        .split(/[\n\r]/)
        .map(v => v.trim())
        .forEach(line => {
          const chunkRegExp = /chunk {(\w+)}\s*([\w|.]+)[^)]*\)\s*([^[]*)\[(\w+)/g;
          const chunkMatch = chunkRegExp.exec(line);
          if (chunkMatch) {
            processedChunks = {
              ...processedChunks,
              [chunkMatch[1]]: {
                name: chunkMatch[1],
                file: chunkMatch[2],
                size: chunkMatch[3].trim(),
                type: chunkMatch[4]
              }
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
      buildStatus = 'build_failure';
      progress = 100;
      newErrors.push(
        ...value
          .substring(value.indexOf('ERROR in') + 8)
          .split(/[\n\r]/)
          .map(v => v.trim())
          .filter(v => v.length > 0)
      );
    }

    const serverErrorMatch = value.match(serverErrorRegExp);
    if (serverErrorMatch) {
      newErrors.push(serverErrorMatch[0]);
    }

    const serverRegExp = /listening on (.+?):(\d+)/;
    const serverMatch = value.match(serverRegExp);

    const errors =
      newErrors.length > 0 ? _state.errors.concat(newErrors) : _state.errors;

    return {
      ..._state,
      buildStatus,
      processedChunks,
      date,
      time,
      errors,
      progress,
      serverHost: serverMatch ? serverMatch[1] : state.serverHost,
      serverPort: serverMatch ? Number(serverMatch[2]) : state.serverPort
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
  | 'build_failure'
  | 'test_failure'
  | 'test_success'
  | 'test_cancelled';

export interface TestDetailedStatus {
  type: StatusType.TEST;
  testStatus: TestStatus;
  buildProgress: number;
  total: number;
  failure: number;
  success: number;
  errors: TestError[];
  buildErrors: string[];
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
      buildErrors: [],
      errors: []
    };
  }

  addOut(rawValue: string) {
    const value = sanitize(rawValue);

    const buildProgress = getNextProgress(
      this.detailedStatus.buildProgress,
      value
    );

    const {
      total,
      failure,
      success,
      testStatus,
      errors,
      buildErrors
    } = TestDetailedStatusCalculator.updateDetailedStatus(
      this.detailedStatus,
      value
    );

    let nextStatus = testStatus;

    if (buildErrors.length > 0) {
      nextStatus = 'build_failure';
    } else if (testStatus === 'test_pending' && buildProgress > 0) {
      nextStatus = 'test_building';
    }

    this.detailedStatus = {
      type: StatusType.TEST,
      buildProgress,
      errors,
      buildErrors,
      total,
      failure,
      success,
      testStatus: nextStatus
    };
  }

  static TEST_PROGRESS_REGEXP = /[\s\S]*Executed\s+(\d+)\s+of\s+(\d+)\s+(SUCCESS\s+|\((\d+)\s+FAILED\))?[\s\S]*/;

  static updateDetailedStatus(
    s: TestDetailedStatus,
    value: string
  ): TestDetailedStatus {
    let _errors = s.errors;
    let buildErrors = s.buildErrors;

    if (value.indexOf('Executed 0') > -1) {
      _errors = [];
      buildErrors = [];
    }

    if (value.indexOf('ERROR in') > -1) {
      buildErrors = buildErrors.concat(
        value
          .substring(value.indexOf('ERROR in') + 8)
          .split(/[\n\r]/)
          .map(v => v.trim())
          .filter(v => v.length > 0)
      );
    }

    const errors = getNextTestErrorState(_errors, value);

    const match = value.match(
      TestDetailedStatusCalculator.TEST_PROGRESS_REGEXP
    );

    if (match) {
      const total = Number(match[2]);
      const soFar = Number(match[1]);
      const failure = Number(match[4] || 0);
      const success = soFar - failure;

      return {
        ...s,
        buildErrors,
        errors,
        total: total,
        testStatus:
          failure + success === total
            ? failure > 0
              ? 'test_failure'
              : 'test_success'
            : 'test_inprogress',
        failure,
        success
      };
    } else {
      return {
        ...s,
        buildErrors,
        errors
      };
    }
  }

  setStatus(value: 'successful' | 'failed' | 'terminated') {
    const { failure, success, total } = this.detailedStatus;
    const allRan = total > 0 && failure + success === total;
    this.detailedStatus = {
      ...this.detailedStatus,
      testStatus: !allRan
        ? this.detailedStatus.buildErrors.length > 0
          ? 'build_failure'
          : 'test_cancelled'
        : failure > 0
          ? 'test_failure'
          : 'test_success'
    };
  }
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

const NEW_CASE_REGEXP = /^\s*[^()]+\([^)]+\)+(.+) FAILED\s*$/;
const ERROR_REGEXP = /^\s+((Error:.+)|(Expected .+))$/;
const TRACE_REGEXP = /^\s+( {2}at .+)$/;

function getNextTestErrorState(_buffer: TestError[], value: string) {
  let buffer = _buffer;

  if (value.indexOf('Connected on socket') > -1) {
    buffer = [];
  }

  const lines = value.split(/[\r\n]/);

  lines.forEach((line, idx) => {
    let match;
    if ((match = line.match(NEW_CASE_REGEXP))) {
      const label = match[1].trim();
      if (buffer.every(b => b.label !== label)) {
        buffer = [...buffer, { label, details: '' }];
      }
    } else if ((match = line.match(ERROR_REGEXP))) {
      const [last, ...rest] = buffer.reverse();
      const additionalErrors = collectPreviousErrorsFrom(idx - 1, lines);
      if (last) {
        const newLine = `${additionalErrors.join('')}${match[1]}`;
        buffer = [
          ...rest,
          { ...last, details: newLine ? `${last.details}${newLine}\n` : '' }
        ];
      }
    } else if ((match = line.match(TRACE_REGEXP))) {
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

function collectPreviousErrorsFrom(idx: number, lines: string[]): string[] {
  const xs = [] as string[];
  let i = idx;

  while (i > 0) {
    const curr = lines[i];
    if (curr.indexOf('FAILED') > -1 || TRACE_REGEXP.test(curr)) {
      break;
    } else if (curr) {
      xs.unshift(curr.replace(/\t/g, ''), '\n');
    }
    i--;
  }

  return xs;
}
