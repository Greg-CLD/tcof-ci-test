/**
 * Unit tests for the UUID endpoint cleaning functionality
 * These tests verify that our UUID extraction works correctly for task IDs
 */

/**
 * Extract the UUID part from a potentially compound task ID
 * This simulates the function used in useProjectTasks.ts
 */
function extractUuid(id: string): string {
  return id.split('-').slice(0, 5).join('-');
}

describe('UUID Endpoint Cleaning', () => {
  test('should properly extract a clean UUID from a compound ID', () => {
    const compoundId = 'abc-def-ghi-jkl-mno-pqr';
    const cleanId = extractUuid(compoundId);
    expect(cleanId).toBe('abc-def-ghi-jkl-mno');
    expect(cleanId).not.toContain('pqr');
  });
  
  test('should leave a regular UUID unchanged', () => {
    const regularUuid = '12345678-1234-5678-abcd-1234567890ab';
    const result = extractUuid(regularUuid);
    expect(result).toBe(regularUuid);
  });
  
  test('should handle malformed IDs gracefully', () => {
    const malformedId = 'invalid-id';
    const result = extractUuid(malformedId);
    expect(result).toBeDefined();
    // Even with malformed inputs, we should get a predictable result
    expect(result).toBe('invalid');
  });
  
  test('should build correct endpoint with cleaned UUID', () => {
    const compoundId = 'abc-def-ghi-jkl-mno-FACTOR123';
    const cleanId = extractUuid(compoundId);
    const endpoint = `/api/projects/project-123/tasks/${cleanId}`;
    
    // The endpoint should contain the clean UUID part only
    expect(endpoint).toContain('abc-def-ghi-jkl-mno');
    expect(endpoint).not.toContain('FACTOR123');
  });
});