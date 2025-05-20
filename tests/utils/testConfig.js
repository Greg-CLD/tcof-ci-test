/**
 * Test configuration utility
 * 
 * This module provides a consistent way to load test environment variables
 * and configuration settings for all test scripts.
 * 
 * Usage:
 * 1. Create a config/test.env file (see config/test.env.example for template)
 * 2. In your test script: const config = require('./utils/testConfig');
 * 3. Access values like: config.TEST_USERNAME, config.TEST_PASSWORD
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const envFile = path.join(rootDir, 'config', 'test.env');

// Default configuration (fallbacks)
const defaults = {
  TEST_USERNAME: process.env.TEST_USERNAME,
  TEST_PASSWORD: process.env.TEST_PASSWORD,
  TEST_PROJECT_ID: process.env.TEST_PROJECT_ID
};

// Load environment variables from test.env file if it exists
function loadEnvFile() {
  if (!fs.existsSync(envFile)) {
    console.warn(`Warning: config/test.env file not found. Using environment variables or defaults.`);
    console.warn(`Create this file from the template at config/test.env.example`);
    return {};
  }

  const content = fs.readFileSync(envFile, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return;
    
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      // Remove quotes if present
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value;
    }
  });
  
  return env;
}

// Combine environment variables from file and process.env
const fileEnv = loadEnvFile();
const config = { ...defaults, ...fileEnv };

// Validation
function validateConfig() {
  const required = ['TEST_USERNAME', 'TEST_PASSWORD'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required test configuration: ${missing.join(', ')}. ` +
      `Please set these in config/test.env or as environment variables.`
    );
  }
}

try {
  validateConfig();
} catch (error) {
  console.error(`\x1b[31m${error.message}\x1b[0m`);
  // Don't throw here, let individual tests handle missing configuration
}

export default config;