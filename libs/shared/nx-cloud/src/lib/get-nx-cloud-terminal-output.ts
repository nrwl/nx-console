import { Readable, Transform, TransformCallback } from 'stream';
import { pipeline } from 'stream/promises';
import { extract } from 'tar-stream';
import * as zlib from 'zlib';

import { Logger } from '@nx-console/shared-utils';

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
