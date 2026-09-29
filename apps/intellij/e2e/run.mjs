import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  writeFile,
  symlink,
  copyFile,
  chmod,
  rm,
  readFile,
  readdir,
  realpath,
} from 'node:fs/promises';
import { createServer, connect } from 'node:net';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(import.meta.url);
const nxPackage = require.resolve('nx/package.json');
const nxBin = resolve(dirname(nxPackage), require(nxPackage).bin.nx);
const runId = randomUUID();
const scenarioName = process.env.NX_E2E_SCENARIO_NAME ?? 'project-view';
const scenarioClass =
  process.env.NX_E2E_SCENARIO_CLASS ??
  'dev.nx.console.automation.ProjectViewTestKt';
if (!/^[a-zA-Z0-9_-]+$/.test(scenarioName))
  throw new Error(`Invalid scenario name: ${scenarioName}`);
const output = join(
  root,
  'dist/apps/intellij/e2e',
  scenarioName === 'project-view' ? 'latest' : scenarioName,
);
const runtime = await realpath(
  await mkdtemp(join(tmpdir(), 'nx-console-intellij-e2e-')),
);
const workspace = join(runtime, 'workspace');
const sandbox = join(runtime, 'sandbox');
const license = join(sandbox, 'config_runAutomationIde/idea.key');
const encodedLicense = process.env.IDEA_LICENSE_BASE64;
delete process.env.IDEA_LICENSE_BASE64;
const started = Date.now();
const children = [];
const abort = new AbortController();
let video;
let failure;
let scenarioProof = '';

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () =>
    abort.abort(new Error(`Interrupted by ${signal}`)),
  );
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
console.log(`IntelliJ e2e artifacts: ${output}`);

const env = {
  ...process.env,
  CI: 'true',
  NX_NO_CLOUD: 'true',
  NX_CLOUD_DISTRIBUTED_EXECUTION: 'false',
  NX_CACHE_FAILURES: 'false',
  NX_DAEMON: 'false',
  NX_PLUGIN_NO_TIMEOUTS: 'true',
  JAVA_TOOL_OPTIONS: `${process.env.JAVA_TOOL_OPTIONS ?? ''} -XX:ActiveProcessorCount=4 -Dorg.gradle.workers.max=2 -Dorg.gradle.priority=low`,
  NX_AUTOMATION_PROJECT: workspace,
  NX_AUTOMATION_OUTPUT: runtime,
  NX_AUTOMATION_SANDBOX: sandbox,
  NX_AUTOMATION_RUN_ID: runId,
  NX_AUTOMATION_LABEL: scenarioName,
};

function start(command, args, name, extra = {}) {
  const log = createWriteStream(join(output, `${name}.log`));
  const child = spawn(command, args, {
    cwd: root,
    env,
    detached: true,
    stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    ...extra,
  });
  let closed = false;
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  child.stdin.on('error', () => {});
  const result = new Promise((resolveResult) => {
    child.once('error', (error) => resolveResult({ error }));
    child.once('close', (code, signal) => {
      closed = true;
      log.end();
      resolveResult({ code, signal });
    });
  });
  const item = {
    child,
    result,
    name,
    get closed() {
      return closed;
    },
  };
  children.push(item);
  return item;
}

async function wait(item, timeout) {
  const timer = new AbortController();
  try {
    const result = await Promise.race([
      item.result,
      delay(timeout, undefined, { signal: timer.signal }).then(() => {
        throw new Error(`${item.name} timed out after ${timeout / 1000}s`);
      }),
      new Promise((_, reject) => {
        if (abort.signal.aborted) reject(abort.signal.reason);
        else
          abort.signal.addEventListener(
            'abort',
            () => reject(abort.signal.reason),
            { once: true, signal: timer.signal },
          );
      }),
    ]);
    if (result.error) throw result.error;
    if (result.code !== 0)
      throw new Error(
        `${item.name} exited with ${result.code ?? result.signal}; see ${item.name}.log`,
      );
  } finally {
    timer.abort();
  }
}

function nx(target, name, extraArgs = '') {
  return start(
    'yarn',
    [
      'nx',
      'run',
      `intellij:${target}`,
      '--batch=false',
      '--parallel=2',
      `--args=--max-workers=2 --priority=low -Dorg.gradle.jvmargs=-Xmx512m -Pkotlin.daemon.jvmargs=-Xmx1g -Dorg.gradle.daemon.idletimeout=10000 ${extraArgs}`.trim(),
    ],
    name,
  );
}

async function waitForPort(port, ide) {
  const deadline = Date.now() + 6 * 60_000;
  while (Date.now() < deadline) {
    abort.signal.throwIfAborted();
    if (ide.child.exitCode !== null || ide.child.signalCode !== null) {
      throw new Error(
        'The IDE launcher exited before JMX was ready; see ide.log',
      );
    }
    const ready = await new Promise((resolveReady) => {
      const socket = connect({ host: '127.0.0.1', port });
      const done = (value) => {
        socket.destroy();
        resolveReady(value);
      };
      socket.once('connect', () => done(true));
      socket.once('error', () => done(false));
      socket.setTimeout(500, () => done(false));
    });
    if (ready) return;
    await delay(500, undefined, { signal: abort.signal });
  }
  throw new Error(
    `The IDE did not expose JMX within 6 minutes; see ide.log and ${scenarioName}.mp4`,
  );
}

async function stop(item, signal = 'SIGTERM') {
  if (!item?.child.pid || item.closed) return;
  try {
    process.kill(-item.child.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
  await Promise.race([item.result, delay(5000)]);
  try {
    process.kill(-item.child.pid, 'SIGKILL');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

function ownedIdePids() {
  // RunIde starts the IDE through a Gradle daemon, outside the Nx process group.
  try {
    const pids = execFileSync(
      'pgrep',
      ['-f', `nx[.]console[.]automation[.]runId=${runId}([[:space:]]|$)`],
      { encoding: 'utf8' },
    );
    return pids
      .trim()
      .split(/\s+/)
      .filter((pid) => /^\d+$/.test(pid))
      .map(Number);
  } catch (error) {
    if (error.status === 1) return [];
    throw new Error('Could not find the IDE process for cleanup', {
      cause: error,
    });
  }
}

try {
  if (!['linux', 'darwin'].includes(process.platform))
    throw new Error('IntelliJ e2e currently supports Linux and macOS');
  if (
    process.env.NX_AGENT_NAME &&
    !encodedLicense &&
    !process.env.NX_INTELLIJ_LICENSE_FILE
  )
    throw new Error(
      'IntelliJ e2e on Nx Agents requires IDEA_LICENSE_BASE64 or NX_INTELLIJ_LICENSE_FILE',
    );
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  await mkdir(join(workspace, 'demo'), { recursive: true });
  await writeFile(
    join(workspace, 'package.json'),
    JSON.stringify({
      name: 'intellij-e2e-fixture',
      private: true,
      devDependencies: { '@fixture/notes-plugin': 'file:tools/notes-plugin' },
      nx: {
        targets: {
          hello: {
            executor: 'nx:run-commands',
            options: { command: 'node -e 0' },
          },
        },
      },
    }),
  );
  await writeFile(
    join(workspace, 'package-lock.json'),
    JSON.stringify({
      name: 'intellij-e2e-fixture',
      lockfileVersion: 3,
      packages: {},
    }),
  );
  await writeFile(
    join(workspace, 'nx.json'),
    JSON.stringify({
      analytics: false,
      namedInputs: { default: ['{projectRoot}/**/*'] },
    }),
  );
  await writeFile(join(workspace, '.gitignore'), 'node_modules\n.nx\n.idea\n');
  await writeFile(
    join(workspace, 'demo/project.json'),
    JSON.stringify({
      name: 'demo',
      root: 'demo',
      projectType: 'application',
      targets: {
        hello: {
          executor: 'nx:run-commands',
          inputs: ['default'],
          options: { command: 'node -e 0' },
        },
      },
    }),
  );
  await mkdir(join(workspace, 'libs/util'), { recursive: true });
  await writeFile(
    join(workspace, 'libs/util/project.json'),
    JSON.stringify({
      name: 'util',
      root: 'libs/util',
      projectType: 'library',
      targets: {
        build: {
          executor: 'nx:run-commands',
          options: { command: 'node -e 0' },
        },
      },
    }),
  );
  const notesPlugin = join(workspace, 'tools/notes-plugin');
  await mkdir(notesPlugin, { recursive: true });
  await writeFile(
    join(notesPlugin, 'package.json'),
    JSON.stringify({
      name: '@fixture/notes-plugin',
      version: '1.0.0',
      generators: './generators.json',
    }),
  );
  await writeFile(
    join(notesPlugin, 'generators.json'),
    JSON.stringify({
      generators: {
        note: {
          factory: './note.cjs',
          schema: './schema.json',
          description: 'Automation note generator',
        },
      },
    }),
  );
  await writeFile(
    join(notesPlugin, 'note.cjs'),
    'module.exports = async function () {};\n',
  );
  await writeFile(
    join(notesPlugin, 'schema.json'),
    JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string', default: 'migration-note' },
        directory: { type: 'string', default: 'notes' },
        enabled: { type: 'boolean', default: true },
        retries: { type: 'number', default: 3 },
      },
      required: ['name', 'directory', 'enabled', 'retries'],
    }),
  );
  await mkdir(join(workspace, 'node_modules/.bin'), { recursive: true });
  await mkdir(join(workspace, 'node_modules/@fixture'), { recursive: true });
  await symlink(
    notesPlugin,
    join(workspace, 'node_modules/@fixture/notes-plugin'),
    'dir',
  );
  await symlink(dirname(nxPackage), join(workspace, 'node_modules/nx'), 'dir');
  await symlink(nxBin, join(workspace, 'node_modules/.bin/nx'));
  execFileSync('git', ['init', '--quiet'], { cwd: workspace });
  await wait(
    start(process.execPath, [nxBin, 'show', 'projects', '--json'], 'fixture', {
      cwd: workspace,
    }),
    60_000,
  );

  const portServer = createServer();
  portServer.listen(0, '127.0.0.1');
  await once(portServer, 'listening');
  env.NX_AUTOMATION_PORT = String(portServer.address().port);
  await new Promise((resolveClose) => portServer.close(resolveClose));

  console.log('Building the automation client…');
  await wait(nx('prepareAutomationClient', 'build-client'), 25 * 60_000);
  console.log('Preparing the IDE sandbox…');
  await wait(
    nx('prepareSandbox_runAutomationIde', 'build-sandbox'),
    25 * 60_000,
  );

  if (process.env.NX_INTELLIJ_LICENSE_FILE) {
    await mkdir(dirname(license), { recursive: true });
    await copyFile(process.env.NX_INTELLIJ_LICENSE_FILE, license);
    await chmod(license, 0o600);
  } else if (encodedLicense) {
    const compact = encodedLicense.replace(/\s/g, '');
    const key = Buffer.from(compact, 'base64');
    if (!key.length || key.toString('base64') !== compact)
      throw new Error(
        'IDEA_LICENSE_BASE64 must contain a base64-encoded idea.key',
      );
    await mkdir(dirname(license), { recursive: true });
    await writeFile(license, key, { mode: 0o600 });
  }

  if (process.platform === 'linux') {
    const display = start(
      'Xvfb',
      ['-displayfd', '3', '-screen', '0', '1280x800x24', '-nolisten', 'tcp'],
      'xvfb',
    );
    const displayNumber = await Promise.race([
      once(display.child.stdio[3], 'data').then(([data]) =>
        data.toString().trim(),
      ),
      display.result.then(() => {
        throw new Error('Xvfb exited before allocating a display');
      }),
      delay(10_000).then(() => {
        throw new Error('Xvfb did not allocate a display');
      }),
    ]);
    if (!/^\d+$/.test(displayNumber))
      throw new Error(`Invalid Xvfb display: ${displayNumber}`);
    env.DISPLAY = `:${displayNumber}`;
    env.NX_E2E_EXTERNAL_VIDEO = 'true';
    video = start(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'warning',
        '-f',
        'x11grab',
        '-video_size',
        '1280x800',
        '-framerate',
        '10',
        '-i',
        env.DISPLAY,
        '-c:v',
        'libx264',
        '-threads',
        '2',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        join(output, `${scenarioName}.mp4`),
      ],
      'video',
    );
  }

  console.log('Launching IntelliJ and waiting for its automation endpoint…');
  const ide = nx(
    'runAutomationIde',
    'ide',
    `--project-cache-dir=${join(runtime, 'gradle')}`,
  );
  await waitForPort(Number(env.NX_AUTOMATION_PORT), ide);
  console.log(
    scenarioName === 'project-view'
      ? 'Checking that Nx Console renders the fixture project and target…'
      : `Running IntelliJ ${scenarioName}…`,
  );
  await Promise.race([
    wait(
      start(
        await readFile(join(runtime, 'automation-java.txt'), 'utf8'),
        [
          '-Xmx512m',
          `-Dnx.console.automation.port=${env.NX_AUTOMATION_PORT}`,
          `-Dnx.console.automation.workspace=${root}`,
          `-Dnx.console.automation.output=${output}`,
          '-classpath',
          await readFile(join(runtime, 'automation-classpath.txt'), 'utf8'),
          scenarioClass,
        ],
        'scenario',
      ),
      6 * 60_000,
    ),
    ide.result.then(() => {
      throw new Error('The IDE launcher exited during the test; see ide.log');
    }),
  ]);
} catch (error) {
  failure = error;
  abort.abort(error);
} finally {
  try {
    if (scenarioName !== 'project-view') {
      const recordings = (await readdir(output)).filter((name) =>
        new RegExp(`^${scenarioName}-[0-9]+$`).test(name),
      );
      if (recordings.length !== 1)
        throw new Error(`Expected one ${scenarioName} recording result`);
      await copyFile(
        join(output, recordings[0], 'result.txt'),
        join(output, `${scenarioName}.txt`),
      );
    }
    scenarioProof = await readFile(join(output, `${scenarioName}.txt`), 'utf8');
    if (!scenarioProof.startsWith('PASS\n'))
      throw new Error(
        `The scenario did not produce a passing ${scenarioName} assertion`,
      );
  } catch (error) {
    failure ??= error;
  }
  try {
    for (const pid of ownedIdePids()) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
    if (video) {
      if (!video.closed) video.child.stdin.end('q\n');
      await Promise.race([video.result, delay(5000)]);
      await stop(video, 'SIGINT');
      const result = await video.result;
      if (result.code !== 0)
        throw new Error('Video capture failed; see video.log');
    }
  } catch (error) {
    failure ??= error;
  }
  for (const item of children.toReversed()) {
    try {
      await stop(item);
    } catch (error) {
      failure ??= error;
    }
  }
  try {
    for (const pid of ownedIdePids()) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
  } catch (error) {
    failure ??= error;
  }
  try {
    execFileSync(process.execPath, [nxBin, 'reset', '--onlyDaemon'], {
      cwd: workspace,
      env: { ...env, NX_DAEMON: 'true' },
      stdio: 'ignore',
      timeout: 15_000,
    });
  } catch (error) {
    failure ??= error;
  }
  try {
    await rm(license, { force: true });
    await copyFile(
      join(sandbox, 'log_runAutomationIde/idea.log'),
      join(output, 'idea.log'),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') failure ??= error;
  }
  try {
    await rm(runtime, { recursive: true, force: true });
  } catch (error) {
    failure ??= error;
  }
  const scenarioFailure = await readFile(
    join(output, 'test-failure.txt'),
    'utf8',
  ).catch(() => (scenarioProof.startsWith('FAIL\n') ? scenarioProof : ''));
  const escape = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  const seconds = ((Date.now() - started) / 1000).toFixed(3);
  await writeFile(
    join(output, 'junit.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="intellij-e2e" tests="1" failures="${failure ? 1 : 0}" time="${seconds}"><testcase classname="NxConsole" name="${scenarioName}" time="${seconds}">${failure ? `<failure message="${escape(failure.message)}">${escape(scenarioFailure || failure.stack)}</failure>` : ''}</testcase></testsuite>\n`,
  );
  await writeFile(
    join(output, 'result.json'),
    JSON.stringify(
      {
        runId,
        passed: !failure,
        error: failure?.stack,
        platform: process.platform,
        arch: process.arch,
        agent: process.env.NX_AGENT_NAME ?? null,
      },
      null,
      2,
    ),
  );
  console.log(
    `${failure ? 'FAIL' : 'PASS'}: IntelliJ ${scenarioName === 'project-view' ? 'project view' : scenarioName}. Artifacts: ${output}`,
  );
  if (failure) {
    console.error(failure.stack);
    process.exitCode = 1;
  }
}
