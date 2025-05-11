#!/usr/bin/env node

/**
 * TypeScript development server starter script
 * This script runs the dev server with proper TypeScript configuration
 */

const { spawn } = require('child_process');
const path = require('path');

// Build the command to run the server
const command = 'tsx';
const args = [
  '-r', 'tsconfig-paths/register',
  'server/index.ts'
];

// Set environment variables for TypeScript path resolution
const env = {
  ...process.env,
  NODE_OPTIONS: '--import=tsx/esm --no-warnings'
};

// Spawn the server process
const server = spawn(command, args, {
  env,
  stdio: 'inherit',
  shell: true
});

// Handle process termination
server.on('close', (code) => {
  console.log(`Development server exited with code ${code}`);
  process.exit(code);
});

// Handle errors
server.on('error', (err) => {
  console.error('Failed to start development server:', err);
  process.exit(1);
});

console.log('Development server starting with TypeScript support...');