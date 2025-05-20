/**
 * Test Configuration Utility
 * 
 * This module provides a consistent way to load test configuration from
 * environment variables or a config file. It's designed to be used across
 * all test scripts to avoid hardcoded credentials.
 * 
 * Usage:
 * ```js
 * const { getTestConfig } = require('./tests/utils/testConfig.js');
 * const config = getTestConfig();
 * 
 * // Access test credentials
 * const credentials = {
 *   username: config.TEST_USERNAME,
 *   password: config.TEST_PASSWORD
 * };
 * ```
 */

const fs = require('fs');
const path = require('path');

/**
 * Loads test configuration from environment variables or config file
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.exitOnMissing - Exit process if required config is missing (default: true)
 * @param {string[]} options.required - List of required configuration keys (default: ['TEST_USERNAME', 'TEST_PASSWORD'])
 * @returns {Object} Configuration object with all test settings
 */
function getTestConfig(options = {}) {
  const {
    exitOnMissing = true,
    required = ['TEST_USERNAME', 'TEST_PASSWORD']
  } = options;

  // Start with environment variables
  const config = {
    TEST_USERNAME: process.env.TEST_USERNAME,
    TEST_PASSWORD: process.env.TEST_PASSWORD,
    TEST_PROJECT_ID: process.env.TEST_PROJECT_ID || 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8',
    TEST_API_URL: process.env.TEST_API_URL || 'http://0.0.0.0:5000',
    TEST_DEBUG_TASKS: process.env.TEST_DEBUG_TASKS === 'true',
    TEST_DEBUG_TASK_API: process.env.TEST_DEBUG_TASK_API === 'true',
    TEST_DEBUG_TASK_COMPLETION: process.env.TEST_DEBUG_TASK_COMPLETION === 'true',
    TEST_DEBUG_TASK_PERSISTENCE: process.env.TEST_DEBUG_TASK_PERSISTENCE === 'true',
    TEST_DEBUG_TASK_STATE: process.env.TEST_DEBUG_TASK_STATE === 'true'
  };

  // Load from config file if available
  const configPath = path.resolve(process.cwd(), 'config', 'test.env');
  if (fs.existsSync(configPath)) {
    console.log('Loading test configuration from config/test.env');
    const envContent = fs.readFileSync(configPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;
      
      // Parse KEY=VALUE format
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        
        // Boolean conversion
        if (value === 'true') value = true;
        if (value === 'false') value = false;
        
        config[key] = value;
      }
    });
  } else {
    console.warn('Config file not found at config/test.env');
    console.warn('Using environment variables or defaults.');
  }

  // Validate required configuration
  const missingKeys = required.filter(key => !config[key]);
  
  if (missingKeys.length > 0) {
    console.error(`ERROR: Missing required test configuration: ${missingKeys.join(', ')}`);
    console.error('Please set these in config/test.env or as environment variables.');
    
    if (exitOnMissing) {
      process.exit(1);
    }
  }

  return config;
}

/**
 * Helper to clean UUIDs in task IDs
 * 
 * @param {string} taskId - The task ID to clean
 * @returns {string} The cleaned UUID
 */
function cleanTaskId(taskId) {
  if (!taskId || typeof taskId !== 'string') return taskId;
  
  // Extract the UUID part (first 5 segments) from a compound ID
  const segments = taskId.split('-');
  if (segments.length >= 5) {
    return segments.slice(0, 5).join('-');
  }
  
  return taskId;
}

module.exports = {
  getTestConfig,
  cleanTaskId
};