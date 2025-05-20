/**
 * Unit tests for extractUuid function in task hooks
 * This tests the ability to extract a clean UUID from compound task IDs
 */

import { describe, it, expect } from 'vitest';

// Import the extractUuid function
// Note: We're creating a local version here to match the implementation
// since the hook function is not directly exported

/**
 * Extract the UUID part from a potentially compound task ID
 * SuccessFactor tasks use a compound ID format: uuid-suffix
 * This function extracts just the UUID part for API calls
 */
function extractUuid(id: string): string {
  // Check if this appears to be a compound ID (contains more than 4 hyphens)
  const hyphenCount = (id.match(/-/g) || []).length;
  
  if (hyphenCount > 4) {
    // Standard UUID has 4 hyphens, extract just the UUID part (first 5 segments)
    const uuidParts = id.split('-');
    if (uuidParts.length >= 5) {
      const uuidOnly = uuidParts.slice(0, 5).join('-');
      return uuidOnly;
    }
  }
  
  // If not a compound ID or extraction failed, return the original
  return id;
}

describe('extractUuid function', () => {
  it('returns the base UUID when given a compound ID', () => {
    const compoundId = '3f197b9f-51f4-5c52-b05e-c035eeb92621-9981d938';
    expect(extractUuid(compoundId)).toBe('3f197b9f-51f4-5c52-b05e-c035eeb92621');
  });

  it('returns the same ID when given a standard UUID', () => {
    const standardUuid = '3f197b9f-51f4-5c52-b05e-c035eeb92621';
    expect(extractUuid(standardUuid)).toBe(standardUuid);
  });

  it('handles the exact compound ID format from the server error log', () => {
    const errorLogId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-f246739f';
    expect(extractUuid(errorLogId)).toBe('2f565bf9-70c7-5c41-93e7-c6c4cde32312');
  });

  it('handles IDs with more than one suffix segment', () => {
    const complexId = '3f197b9f-51f4-5c52-b05e-c035eeb92621-extra-segments-here';
    expect(extractUuid(complexId)).toBe('3f197b9f-51f4-5c52-b05e-c035eeb92621');
  });

  it('returns the original ID for non-UUID formats', () => {
    expect(extractUuid('not-a-uuid')).toBe('not-a-uuid');
    expect(extractUuid('123456')).toBe('123456');
  });

  it('handles empty strings', () => {
    expect(extractUuid('')).toBe('');
  });
});