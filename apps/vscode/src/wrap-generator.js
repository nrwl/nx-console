const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

// Get all arguments passed to this script
const args = process.argv.slice(4);

// Determine the generator name (assuming first arg is the command and second is the generator)
const generatorName = args[1] || 'unknown-generator';

// Create output directory if it doesn't exist
const outputDir = path.join(process.cwd(), '.nx/workspace-data');
mkdirp.sync(outputDir);

// Output file path
const outputFile = path.join(outputDir, `${generatorName}.log`);

// Storage for output lines
const outputLines = [];

// Execute the command with all arguments
const command = args[0];
const commandArgs = args.slice(1);

const childProcess = spawn(command, commandArgs, {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
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
