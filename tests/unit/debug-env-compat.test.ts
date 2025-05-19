/**
 * Unit tests for debug environment flags compatibility
 * Tests that DEBUG, DEBUG_TASKS, DEBUG_FILTERS, and DEBUG_FILES 
 * correctly reflect Vite environment variables
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// We need to mock the import.meta.env object before importing the constants
vi.mock('@shared/constants.debug', async (importOriginal) => {
  // Store the original implementation
  const originalModule = await importOriginal();
  
  return {
    ...originalModule,
    // Allow us to override these in tests
    DEBUG: vi.fn(),
    DEBUG_TASKS: vi.fn(),
    DEBUG_FILTERS: vi.fn(),
    DEBUG_FILES: vi.fn(),
  };
});

// Import after mocking
import { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } from '@shared/constants.debug';

describe('Debug Environment Constants', () => {
  // Setup and teardown to reset mocks
  let originalImportMeta;
  let originalEnv;
  
  beforeEach(() => {
    // Save original import.meta and env to restore later
    originalImportMeta = global.import?.meta ? { ...global.import.meta } : undefined;
    originalEnv = originalImportMeta?.env ? { ...originalImportMeta.env } : undefined;
    
    // Create a fresh import.meta.env object for each test to avoid leaking state
    global.import = global.import || {};
    global.import.meta = global.import.meta || {};
    global.import.meta.env = {};
    
    // Reset all mocks
    vi.resetAllMocks();
  });
  
  afterEach(() => {
    // Restore original import.meta and env
    if (originalImportMeta) {
      global.import.meta = originalImportMeta;
    } else {
      delete global.import.meta;
    }
    
    // Explicitly clean up any test variables
    vi.restoreAllMocks();
  });
  
  // Production environment tests
  it('should default all debug flags to false in production', () => {
    // Mock production environment
    global.import.meta = {
      env: {
        MODE: 'production'
      }
    };
    
    // Re-import to get fresh constants based on current mock
    const { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } = require('@shared/constants.debug');
    
    expect(DEBUG).toBe(false);
    expect(DEBUG_TASKS).toBe(false);
    expect(DEBUG_FILTERS).toBe(false);
    expect(DEBUG_FILES).toBe(false);
  });

  // Development mode tests
  it('should set DEBUG true in development mode, others false if not explicitly enabled', () => {
    // Mock development environment with no explicit debug flags
    global.import.meta = {
      env: {
        MODE: 'development'
      }
    };
    
    // Re-import to get fresh constants
    const { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } = require('@shared/constants.debug');
    
    expect(DEBUG).toBe(true);
    expect(DEBUG_TASKS).toBe(false);
    expect(DEBUG_FILTERS).toBe(false);
    expect(DEBUG_FILES).toBe(false);
  });

  // Individual flags tests
  it('should enable DEBUG_TASKS when in development and VITE_DEBUG_TASKS=true', () => {
    // Mock development with VITE_DEBUG_TASKS=true
    global.import.meta = {
      env: {
        MODE: 'development',
        VITE_DEBUG_TASKS: 'true'
      }
    };
    
    // Re-import to get fresh constants
    const { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } = require('@shared/constants.debug');
    
    expect(DEBUG).toBe(true);
    expect(DEBUG_TASKS).toBe(true);
    expect(DEBUG_FILTERS).toBe(false);
    expect(DEBUG_FILES).toBe(false);
  });
  
  it('should enable DEBUG_FILTERS when in development and VITE_DEBUG_FILTERS=true', () => {
    // Mock development with VITE_DEBUG_FILTERS=true
    global.import.meta = {
      env: {
        MODE: 'development',
        VITE_DEBUG_FILTERS: 'true'
      }
    };
    
    // Re-import to get fresh constants
    const { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } = require('@shared/constants.debug');
    
    expect(DEBUG).toBe(true);
    expect(DEBUG_TASKS).toBe(false);
    expect(DEBUG_FILTERS).toBe(true);
    expect(DEBUG_FILES).toBe(false);
  });

  it('should enable DEBUG_FILES when in development and VITE_DEBUG_FILES=true', () => {
    // Mock development with VITE_DEBUG_FILES=true
    global.import.meta = {
      env: {
        MODE: 'development',
        VITE_DEBUG_FILES: 'true'
      }
    };
    
    // Re-import to get fresh constants
    const { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } = require('@shared/constants.debug');
    
    expect(DEBUG).toBe(true);
    expect(DEBUG_TASKS).toBe(false);
    expect(DEBUG_FILTERS).toBe(false);
    expect(DEBUG_FILES).toBe(true);
  });

  // Multiple flags tests
  it('should enable multiple debug flags when corresponding env vars are true', () => {
    // Mock development with multiple flags set to true
    global.import.meta = {
      env: {
        MODE: 'development',
        VITE_DEBUG_TASKS: 'true',
        VITE_DEBUG_FILTERS: 'true',
        VITE_DEBUG_FILES: 'true'
      }
    };
    
    // Re-import to get fresh constants
    const { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } = require('@shared/constants.debug');
    
    expect(DEBUG).toBe(true);
    expect(DEBUG_TASKS).toBe(true);
    expect(DEBUG_FILTERS).toBe(true);
    expect(DEBUG_FILES).toBe(true);
  });
  
  // Edge cases
  it('should handle undefined env vars as false', () => {
    // Mock development with undefined debug flags
    global.import.meta = {
      env: {
        MODE: 'development',
        // Explicitly undefined vars
        VITE_DEBUG_TASKS: undefined,
        VITE_DEBUG_FILTERS: undefined,
        VITE_DEBUG_FILES: undefined
      }
    };
    
    // Re-import to get fresh constants
    const { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } = require('@shared/constants.debug');
    
    expect(DEBUG).toBe(true);
    expect(DEBUG_TASKS).toBe(false);
    expect(DEBUG_FILTERS).toBe(false);
    expect(DEBUG_FILES).toBe(false);
  });
  
  it('should handle empty string env vars as false', () => {
    // Mock development with empty string debug flags
    global.import.meta = {
      env: {
        MODE: 'development',
        VITE_DEBUG_TASKS: '',
        VITE_DEBUG_FILTERS: '',
        VITE_DEBUG_FILES: ''
      }
    };
    
    // Re-import to get fresh constants
    const { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } = require('@shared/constants.debug');
    
    expect(DEBUG).toBe(true);
    expect(DEBUG_TASKS).toBe(false);
    expect(DEBUG_FILTERS).toBe(false);
    expect(DEBUG_FILES).toBe(false);
  });
  
  it('should keep all debug flags false in production even if VITE_DEBUG_* are set to true', () => {
    // Mock production environment with all debug flags set to true
    global.import.meta = {
      env: {
        MODE: 'production',
        VITE_DEBUG_TASKS: 'true',
        VITE_DEBUG_FILTERS: 'true',
        VITE_DEBUG_FILES: 'true'
      }
    };
    
    // Re-import to get fresh constants
    const { DEBUG, DEBUG_TASKS, DEBUG_FILTERS, DEBUG_FILES } = require('@shared/constants.debug');
    
    // Production should override all debug flags to false
    expect(DEBUG).toBe(false);
    expect(DEBUG_TASKS).toBe(false);
    expect(DEBUG_FILTERS).toBe(false);
    expect(DEBUG_FILES).toBe(false);
  });
});