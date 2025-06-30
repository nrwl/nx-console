#!/usr/bin/env node

// DXT wrapper for nx-mcp
// This script handles environment variables from Claude Desktop and passes them as arguments

const { spawn } = require('child_process');
const path = require('path');

// Get the workspace path from environment variable (set by Claude Desktop from user config)
const workspacePath = process.env.NX_WORKSPACE_PATH;

// Build the arguments array
const args = [];

// Add workspace path if provided
if (workspacePath && workspacePath.trim()) {
  args.push(workspacePath);
}

// Path to the main nx-mcp server
const mainPath = path.join(__dirname, 'main.js');

// Spawn the nx-mcp server with the appropriate arguments
const child = spawn(process.execPath, [mainPath, ...args], {
  stdio: 'inherit',
  env: process.env
});

// Forward the exit code
child.on('exit', (code) => {
  process.exit(code);
});

// Handle errors
child.on('error', (err) => {
  console.error('Failed to start nx-mcp server:', err);
  process.exit(1);
});