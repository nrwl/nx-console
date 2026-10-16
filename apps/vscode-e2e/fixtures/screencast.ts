import type { CDPSession, Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createConcatList, type ScreencastFrame } from './vscode-e2e-runtime';

/**
 * Records the VS Code window through the DevTools screencast, which works both
 * for an IDE launched by the test and for an already running automation IDE.
 */
export class ScreencastRecorder {
  private readonly frames: ScreencastFrame[] = [];
  private readonly acknowledgements: Promise<unknown>[] = [];

  private constructor(
    private readonly session: CDPSession,
    private readonly framesDir: string,
  ) {}

  static async start(
    page: Page,
    framesDir: string,
  ): Promise<ScreencastRecorder> {
    mkdirSync(framesDir, { recursive: true });
    const session = await page.context().newCDPSession(page);
    const recorder = new ScreencastRecorder(session, framesDir);
    session.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      const file = `${String(recorder.frames.length).padStart(6, '0')}.jpg`;
      writeFileSync(join(framesDir, file), Buffer.from(data, 'base64'));
      recorder.frames.push({
        file,
        timestamp: metadata.timestamp ?? Date.now() / 1000,
      });
      recorder.acknowledgements.push(
        session
          .send('Page.screencastFrameAck', { sessionId })
          .catch(() => undefined),
      );
    });
    await session.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
    });
    return recorder;
  }

  async stop(output: string): Promise<void> {
    const end = Date.now() / 1000;
    await this.session.send('Page.stopScreencast').catch(() => undefined);
    await Promise.all(this.acknowledgements);
    await this.session.detach().catch(() => undefined);
    const list = join(this.framesDir, 'frames.ffconcat');
    writeFileSync(list, createConcatList(this.frames, end));
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        list,
        '-vf',
        'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
        '-r',
        '25',
        '-c:v',
        'libx264',
        '-movflags',
        '+faststart',
        output,
      ],
      { stdio: 'pipe', timeout: 300_000 },
    );
    rmSync(this.framesDir, { recursive: true, force: true });
  }
}
