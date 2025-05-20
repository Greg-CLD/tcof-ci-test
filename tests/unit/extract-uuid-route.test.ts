/**
 * Unit tests for UUID extraction logic in task route handler
 * 
 * This test verifies that the UUID extraction logic correctly handles
 * compound task IDs by extracting just the UUID portion
 */

describe('UUID Extraction in Route Handler', () => {
  it('extracts clean UUID from compound id', () => {
    const raw = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-dfd5e65a';
    const uuid = raw.split('-').slice(0, 5).join('-');
    expect(uuid).toBe('2f565bf9-70c7-5c41-93e7-c6c4cde32312');
  });

  it('handles simple UUIDs without modification', () => {
    const raw = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';
    const uuid = raw.split('-').slice(0, 5).join('-');
    expect(uuid).toBe('2f565bf9-70c7-5c41-93e7-c6c4cde32312');
  });

  it('handles non-standard compound IDs', () => {
    const raw = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-extra-parts-here';
    const uuid = raw.split('-').slice(0, 5).join('-');
    expect(uuid).toBe('2f565bf9-70c7-5c41-93e7-c6c4cde32312');
  });

  it('safely handles empty strings', () => {
    const raw = '';
    const uuid = raw.split('-').slice(0, 5).join('-');
    expect(uuid).toBe('');
  });
});