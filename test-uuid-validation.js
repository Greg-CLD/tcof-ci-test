/**
 * Test Script for UUID Validation
 * 
 * This test validates our improved UUID format validation in the task lookup process.
 * It simulates the improved validation code we added to projectsDb.ts
 */

// Helper function to check if a string is a valid UUID
function isValidUuidFormat(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Helper function to check if a string looks like a UUID prefix
function isValidUuidPrefix(id) {
  // A valid UUID prefix could be a complete UUID or partial UUID with proper format
  // First, check if it's a complete UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return true;
  }
  
  // Check if it's a partial UUID with proper hyphens and hex format
  // The pattern requires at least the first segment to be full length (8 chars)
  // and subsequent segments must be properly formatted with hyphens
  return /^[0-9a-f]{8}(-[0-9a-f]{1,4}){0,4}$/i.test(id);
}

// Test various task ID formats against our validation
function testValidation() {
  console.log('=== UUID VALIDATION TEST ===\n');
  
  const testCases = [
    // Valid full UUIDs
    { id: '2f565bf9-70c7-5c41-93e7-c6c4cde32312', expectedFullMatch: true, expectedPrefixMatch: true, description: 'Valid UUID' },
    
    // Valid UUID prefixes
    { id: '2f565bf9', expectedFullMatch: false, expectedPrefixMatch: true, description: 'Valid UUID prefix (first segment)' },
    { id: '2f565bf9-70c7', expectedFullMatch: false, expectedPrefixMatch: true, description: 'Valid UUID prefix (two segments)' },
    
    // Invalid formats
    { id: 'not-a-uuid', expectedFullMatch: false, expectedPrefixMatch: false, description: 'Invalid format (not hex)' },
    { id: '12345', expectedFullMatch: false, expectedPrefixMatch: false, description: 'Invalid format (short number)' },
    { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff1', expectedFullMatch: false, expectedPrefixMatch: false, description: 'Too long UUID' },
    
    // Problematic format from our test
    { id: 'ffffffff-ffff-ffff-ffff-' + Date.now().toString(16), expectedFullMatch: false, expectedPrefixMatch: false, description: 'Problematic format from previous test' }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  testCases.forEach(testCase => {
    console.log(`\nTesting: ${testCase.id} (${testCase.description})`);
    
    // Test full UUID validation
    const isFullUuid = isValidUuidFormat(testCase.id);
    const fullMatchResult = isFullUuid === testCase.expectedFullMatch;
    
    console.log(`Full UUID validation: ${isFullUuid ? '✅ Valid' : '❌ Invalid'} (${fullMatchResult ? 'CORRECT' : 'INCORRECT'})`);
    
    // Test UUID prefix validation
    const isPrefixUuid = isValidUuidPrefix(testCase.id);
    const prefixMatchResult = isPrefixUuid === testCase.expectedPrefixMatch;
    
    console.log(`Prefix UUID validation: ${isPrefixUuid ? '✅ Valid' : '❌ Invalid'} (${prefixMatchResult ? 'CORRECT' : 'INCORRECT'})`);
    
    if (fullMatchResult && prefixMatchResult) {
      passedTests++;
    } else {
      failedTests++;
    }
  });
  
  console.log(`\n=== TEST RESULTS ===`);
  console.log(`Tests passed: ${passedTests}/${testCases.length}`);
  console.log(`Tests failed: ${failedTests}/${testCases.length}`);
  
  return passedTests === testCases.length;
}

// Run the tests
const testsPassed = testValidation();
console.log(`\nOverall validation test ${testsPassed ? '✅ PASSED' : '❌ FAILED'}`);