import { spawnSync } from 'node:child_process';
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, join, resolve, relative, delimiter } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = join(root, 'dist/apps/intellij/e2e-prepare');
const sandbox = join(root, 'dist/apps/intellij/e2e-staging/sandbox');
await rm(sandbox, { recursive: true, force: true });
const result = spawnSync(
  'yarn',
  [
    'nx',
    'run',
    'intellij:prepareE2e',
    '--batch=false',
    // Concurrent Gradle builds in one checkout race on IntelliJ platform local artifact metadata.
    '--parallel=1',
    '--excludeDependsOn=false',
    '--args=--max-workers=2 --priority=low -Dorg.gradle.jvmargs=-Xmx512m -Pkotlin.daemon.jvmargs=-Xmx1g',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    timeout: 25 * 60_000,
    env: {
      ...process.env,
      JAVA_TOOL_OPTIONS: '-XX:ActiveProcessorCount=4',
      NX_AUTOMATION_SANDBOX: sandbox,
      NX_AUTOMATION_PROJECT: root.replace(/\/$/, ''),
      NX_AUTOMATION_PORT: '20000',
      NX_AUTOMATION_RUN_ID: '',
      NX_AUTOMATION_IDE_HEAP: '2g',
      NX_AUTOMATION_OUTPUT: join(root, 'dist/apps/intellij/automation'),
    },
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const launch = JSON.parse(
  await readFile(join(root, 'dist/apps/intellij/e2e-launch.json'), 'utf8'),
);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const mappings = new Map([[sandbox, '@SANDBOX@']]);
async function bundle(source, destination) {
  const target = join(output, destination);
  await cp(source, target, { recursive: true, dereference: true });
  mappings.set(resolve(source), `@PREP@/${destination}`);
  return `@PREP@/${destination}`;
}
const ide = resolve(launch.cwd);
if (!ide.startsWith(join(root, '.intellijPlatform') + '/'))
  throw new Error(
    `Expected the pinned IDE under .intellijPlatform, got ${ide}`,
  );
const ideJars = new Map();
async function indexJars(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort(
    (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  )) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await indexJars(path);
    else if (entry.name.endsWith('.jar')) {
      const size = (await stat(path)).size;
      const candidates = ideJars.get(size) ?? [];
      candidates.push(path);
      ideJars.set(size, candidates);
    }
  }
}
await indexJars(ide);
const digests = new Map();
async function digest(path) {
  if (!digests.has(path))
    digests.set(
      path,
      createHash('sha256')
        .update(await readFile(path))
        .digest('hex'),
    );
  return digests.get(path);
}
await cp(sandbox, join(output, 'sandbox'), {
  recursive: true,
  dereference: true,
});
for (const [index, arg] of launch.jvmArgs
  .filter((arg) => arg.startsWith('-javaagent:'))
  .entries()) {
  const path = arg.slice('-javaagent:'.length).split('=')[0];
  if (
    resolve(path) === join(root, '.intellijPlatform/coroutines-javaagent.jar')
  ) {
    // The generated stub names the same premain class already shipped in this IDE jar.
    const agent = join(
      ide,
      'lib/intellij.libraries.kotlinx.coroutines.core.jar',
    );
    await stat(agent);
    mappings.set(resolve(path), `@ROOT@/${relative(root, agent)}`);
  } else {
    await bundle(path, `agents/${index}.jar`);
  }
}
const clientClasspath = [];
for (const [index, path] of launch.clientClasspath.entries()) {
  let existing;
  if ((await stat(path)).isFile()) {
    for (const candidate of ideJars.get((await stat(path)).size) ?? []) {
      if ((await digest(path)) === (await digest(candidate))) {
        existing = `@ROOT@/${relative(root, candidate)}`;
        break;
      }
    }
  }
  clientClasspath.push(
    existing ?? (await bundle(path, `client/${index}/${basename(path)}`)),
  );
}
function relocate(value) {
  for (const [source, target] of [...mappings].sort(
    ([a], [b]) => b.length - a.length,
  )) {
    value = value.replaceAll(source, target);
  }
  return value.replaceAll(root.replace(/\/$/, ''), '@ROOT@');
}
const manifest = {
  java: relocate(launch.java),
  cwd: relocate(launch.cwd),
  jvmArgs: launch.jvmArgs.map((arg) => {
    if (/^-Dcom\.sun\.management\.jmxremote\.(rmi\.)?port=/.test(arg))
      return arg.replace(/=.+$/, '=@PORT@');
    if (arg.startsWith('-Dnx.console.automation.runId'))
      return '-Dnx.console.automation.runId=@RUN_ID@';
    return relocate(arg);
  }),
  classpath: launch.classpath.map(relocate),
  mainClass: launch.mainClass,
  args: launch.args.map(relocate),
  clientClasspath: clientClasspath.join(delimiter),
};
await writeFile(
  join(output, 'launch.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(`Prepared IntelliJ e2e runtime: ${output}`);
