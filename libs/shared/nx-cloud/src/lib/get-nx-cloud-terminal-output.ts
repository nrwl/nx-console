import { Readable, Transform, TransformCallback } from 'stream';
import { pipeline } from 'stream/promises';
import { extract } from 'tar-stream';
import * as zlib from 'zlib';

import { getNxCloudUrl, isNxCloudUsed } from '@nx-console/shared-nx-cloud';
import { Logger, httpRequest, HttpError } from '@nx-console/shared-utils';
import { nxCloudAuthHeaders } from './nx-cloud-auth-headers';

export async function getNxCloudTerminalOutput(
  request: {
    taskId: string;
    ciPipelineExecutionId?: string;
    linkId?: string;
  },
  workspacePath: string,
  logger: Logger,
): Promise<{ terminalOutput?: string; error?: string }> {
  if (!(await isNxCloudUsed(workspacePath, logger))) {
    return { error: 'Nx Cloud is not used in this workspace.' };
  }

  const nxCloudUrl = await getNxCloudUrl(workspacePath);
  const url = `${nxCloudUrl}/nx-cloud/nx-console/ci-pipeline-executions/terminal-outputs`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await nxCloudAuthHeaders(workspacePath)),
  };

  try {
    const response = await httpRequest({
      type: 'POST',
      url,
      data: JSON.stringify({
        executionId: request.ciPipelineExecutionId ?? null,
        taskId: request.taskId,
        linkId: request.linkId ?? null,
      }),
      headers,
    });
    const responseData = JSON.parse(response.responseText) as {
      artifactUrl: string;
    };

    const terminalOutput = await downloadAndExtractArtifact(
      responseData.artifactUrl,
      logger,
    );
    // Remove ANSI escape codes (color codes and other terminal control sequences)
    const strippedOutput = terminalOutput.replace(
      /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g,
      '',
    );
    return { terminalOutput: strippedOutput };
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) {
      logger.log(`Authentication error: ${e.responseText}`);
      return {
        error: e.responseText,
      };
    }
    logger.log(`Error: ${JSON.stringify(e)}`);
    return {
      error: e.responseText ?? e.message,
    };
  }
}

export async function downloadAndExtractArtifact(
  artifactUrl: string,
  logger: Logger,
): Promise<string> {
  const response = await fetch(artifactUrl, {
    method: 'GET',
    headers: {
      Accept: '*/*',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.log(
      `Failed to download artifact: ${response.status} - ${errorText}`,
    );
    throw new Error(
      `Failed to download artifact: ${response.status} - ${errorText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const tarExtractStream = new TarExtractTransform(logger);
  const bodyStream = new Readable();
  bodyStream.push(Buffer.from(arrayBuffer));
  bodyStream.push(null);
  // todo(cammisuli): add support for encrypted artifacts
  await pipeline(bodyStream, zlib.createGunzip(), tarExtractStream);

  return tarExtractStream.getResult();
}

class TarExtractTransform extends Transform {
  private tarExtractStream = extract();
  private terminalOutput = '';
  private terminalOutputStream!: Promise<void>;
  private finished!: Promise<void>;
  private finish!: () => void;

  constructor(private logger: Logger) {
    super();
    this.setupListeners();
  }

  private setupListeners() {
    this.finished = new Promise<void>((res) => {
      this.finish = res;
    });
    this.on('finish', () => {
      this.finish();
    });

    this.tarExtractStream.on('entry', (header, stream, next) => {
      // for older tars that were created on windows, the paths in the tar will have `\` instead of `/`
      // this normalizes it so that it will be checked correctly with posixJoin
      const headerName = header.name.split('\\').join('/');

      if (headerName.startsWith('terminalOutputs/')) {
        this.terminalOutputStream = new Promise<void>((res) => {
          stream.on('data', (chunk) => {
            this.logger.log('Streaming terminal output file');
            this.terminalOutput += chunk;
          });
          stream.on('end', () => {
            this.logger.log('Terminal output file stream ended');
            next();
            res();
          });
        });
      } else {
        // ignore other files and continue streaming
        next();
      }
    });

    this.tarExtractStream.on('finish', () => {
      this.logger.log('Tar stream finished');
      this.emit('finish');
    });
  }

  override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    const res = this.tarExtractStream.write(chunk, encoding);
    if (res) {
      callback();
    } else {
      this.tarExtractStream.once('drain', callback);
    }
  }

  override _flush(callback: TransformCallback) {
    this.tarExtractStream.end(callback);
  }

  async getResult() {
    this.logger.log('Getting result from tar stream');
    await this.finished;
    await this.terminalOutputStream;

    return this.terminalOutput;
  }
}
