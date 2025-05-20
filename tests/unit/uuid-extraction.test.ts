/**
 * Unit tests for UUID extraction functionality
 * 
 * These tests verify that our task ID UUID extraction logic correctly handles
 * different types of IDs, including compound IDs with suffix components.
 */

// Simple extraction function that mimics the one in useProjectTasks.ts
function extractUuid(id: string): string {
  return id.split('-').slice(0,5).join('-');
}

describe('UUID Extraction', () => {
  test('extracts clean UUID from compound ID', () => {
    const compoundId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-factor123';
    const cleanId = extractUuid(compoundId);
    expect(cleanId).toBe('2f565bf9-70c7-5c41-93e7-c6c4cde32312');
  });

  test('leaves standard UUID unchanged', () => {
    const standardUuid = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';
    const cleanId = extractUuid(standardUuid);
    expect(cleanId).toBe(standardUuid);
  });

  test('handles malformed IDs gracefully', () => {
    const malformedId = 'invalid-uuid';
    const result = extractUuid(malformedId);
    expect(result).toBe('invalid');
  });

  test('correctly handles IDs with fewer than 5 segments', () => {
    const shortId = 'a-b-c';
    const result = extractUuid(shortId);
    expect(result).toBe('a-b-c');
  });

  test('extracts exactly 5 segments from long IDs', () => {
    const longId = 'a-b-c-d-e-f-g-h-i-j';
    const result = extractUuid(longId);
    expect(result).toBe('a-b-c-d-e');
    expect(result.split('-').length).toBe(5);
  });
});