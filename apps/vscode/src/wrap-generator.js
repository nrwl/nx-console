const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

let generatorName = args[3] || 'unknown-generator';

generatorName = generatorName.startsWith('@')
  ? generatorName.substring(1).replace(/[/:]/g, '-')
  : generatorName.replace(/[@/:]/g, '-');

let cacheDir = './.nx/workspace-data';
try {
  const cacheDirModulePath = require.resolve('nx/src/utils/cache-directory', {
    paths: [process.cwd()],
  });
  if (cacheDirModulePath) {
    const cacheDirModule = require(cacheDirModulePath);
    cacheDir = cacheDirModule.workspaceDataDirectory;
  }
} catch (e) {
  // do nothing
}

const outputDir = path.join(cacheDir, 'console-generators');
fs.mkdirSync(outputDir, { recursive: true });

const findNextAvailableFileName = (baseName) => {
  const baseFileName = path.join(outputDir, `${baseName}.log`);

  if (!fs.existsSync(baseFileName)) {
    return baseFileName;
  }

  let counter = 1;
  let nextFileName;

  do {
    nextFileName = path.join(outputDir, `${baseName}-${counter}.log`);
    counter++;
  } while (fs.existsSync(nextFileName));

  return nextFileName;
};

const outputFile = findNextAvailableFileName(generatorName);

const outputLines = [];

const command = args[0];
const commandArgs = args.slice(1);

const env = {
  ...process.env,
  FORCE_COLOR: 'true',
  COLORTERM: 'truecolor',
  TERM: process.env.TERM || 'xterm-256color',
};

const childProcess = spawn(command, commandArgs, {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env,
  cwd: process.cwd(),
});

// Capture and forward stdout
childProcess.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  outputLines.push(text);
});

// Capture and forward stderr
childProcess.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text);
  outputLines.push(text);
});

// Handle process completion
childProcess.on('close', (code) => {
  // Write captured output to file
  fs.writeFileSync(outputFile, outputLines.join(''));
  process.exit(code);
});

// Handle errors
childProcess.on('error', (err) => {
  console.error(`Failed to start command: ${err}`);
  process.exit(1);
});
