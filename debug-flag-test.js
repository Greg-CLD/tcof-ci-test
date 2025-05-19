/**
 * Debug Flag Test
 * This script verifies that our debug flag system is properly functioning
 */

// Import the debug constants
import { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } from './shared/constants.debug.js';

// Print the status of each debug flag
console.log({
  DEBUG,
  DEBUG_TASKS,
  DEBUG_FILTERS,
  DEBUG_FILES
});

// Test logging with debug flags
console.log('\nTesting conditional logs:');

// Standard debug log
if (DEBUG) {
  console.log('This DEBUG log should appear in development mode');
} else {
  console.log('DEBUG flag is disabled');
}

// Task debug log
if (DEBUG_TASKS) {
  console.log('This DEBUG_TASKS log should appear if VITE_DEBUG_TASKS=true');
} else {
  console.log('DEBUG_TASKS flag is disabled');
}

// Filters debug log
if (DEBUG_FILTERS) {
  console.log('This DEBUG_FILTERS log should appear if VITE_DEBUG_FILTERS=true');
} else {
  console.log('DEBUG_FILTERS flag is disabled');
}

// Files debug log
if (DEBUG_FILES) {
  console.log('This DEBUG_FILES log should appear if VITE_DEBUG_FILES=true');
} else {
  console.log('DEBUG_FILES flag is disabled');
}

console.log('\nTest complete!');