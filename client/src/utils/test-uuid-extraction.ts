/**
 * Utility script to test UUID extraction in the browser console
 * This can be run directly in the browser console to test extraction
 */

/**
 * Extracts the UUID part from a potentially compound task ID
 * 
 * @param id The task ID which might be a compound ID
 * @returns The extracted UUID part only
 */
export function extractUuid(id: string): string {
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

/**
 * Test UUID extraction with a sample task ID
 * This can be run directly in the browser console
 */
export function testUuidExtraction(taskId: string = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-e253fe5a') {
  console.group('UUID Extraction Test');
  console.log('Original task ID:', taskId);
  
  const cleanId = extractUuid(taskId);
  console.log('Extracted UUID:', cleanId);
  
  // Log for TRACE_NET verification
  console.debug(`[TRACE_NET] Task update clean ID extraction:
- Original task ID: ${taskId}
- Cleaned UUID for API: ${cleanId}`);
  
  console.log('Test result:', cleanId !== taskId ? 'Extraction performed' : 'No extraction needed');
  console.groupEnd();
  
  return { original: taskId, extracted: cleanId };
}

// Add function to window for easy testing
if (typeof window !== 'undefined') {
  (window as any).testUuidExtraction = testUuidExtraction;
  console.log('UUID extraction test utility available: testUuidExtraction("your-task-id")');
}