/**
 * Script to test UUID conversion functionality
 * This will:
 * 1. Test converting "sf-#" format IDs to UUIDs
 * 2. Verify the conversion is deterministic (same input produces same output)
 * 3. Confirm proper ID tracking and original ID retrieval
 */

// Import the standalone test utilities
const { 
  convertToUuid, 
  isValidUuid, 
  getOriginalId, 
  wasGeneratedFrom,
  generateUuid
} = require('./test-uuid-utils.cjs');

// Original success factor IDs
const originalIds = [
  'sf-1',
  'sf-2',
  'sf-3',
  'sf-4',
  'sf-5',
  'sf-6',
  'sf-7',
  'sf-8',
  'sf-9',
  'sf-10',
  'sf-11',
  'sf-12'
];

// Test deterministic conversion (same input = same output)
function testDeterministicConversion() {
  console.log('\n=== Testing Deterministic Conversion ===');
  
  const firstRound = originalIds.map(id => convertToUuid(id));
  const secondRound = originalIds.map(id => convertToUuid(id));
  
  let allMatch = true;
  for (let i = 0; i < originalIds.length; i++) {
    const match = firstRound[i] === secondRound[i];
    console.log(`${originalIds[i]} -> ${firstRound[i]} | Match: ${match ? '✓' : '✗'}`);
    if (!match) allMatch = false;
  }
  
  console.log(`\nAll conversions deterministic: ${allMatch ? '✓' : '✗'}`);
  
  return allMatch;
}

// Test original ID tracking and retrieval
function testOriginalIdTracking() {
  console.log('\n=== Testing Original ID Tracking ===');
  
  const uuids = originalIds.map(id => convertToUuid(id));
  let allTracked = true;
  
  for (let i = 0; i < originalIds.length; i++) {
    const originalId = getOriginalId(uuids[i]);
    const match = originalId === originalIds[i];
    console.log(`${uuids[i]} -> Original: ${originalId} | Match: ${match ? '✓' : '✗'}`);
    if (!match) allTracked = false;
  }
  
  console.log(`\nAll original IDs tracked: ${allTracked ? '✓' : '✗'}`);
  
  return allTracked;
}

// Test wasGeneratedFrom function
function testWasGeneratedFrom() {
  console.log('\n=== Testing wasGeneratedFrom ===');
  
  const uuids = originalIds.map(id => convertToUuid(id));
  let allMatch = true;
  
  for (let i = 0; i < originalIds.length; i++) {
    const correctMatch = wasGeneratedFrom(uuids[i], originalIds[i]);
    const wrongMatch = wasGeneratedFrom(uuids[i], originalIds[(i + 1) % originalIds.length]);
    
    console.log(`${uuids[i]} was generated from ${originalIds[i]}: ${correctMatch ? '✓' : '✗'}`);
    console.log(`${uuids[i]} was NOT generated from ${originalIds[(i + 1) % originalIds.length]}: ${!wrongMatch ? '✓' : '✗'}`);
    
    if (!correctMatch || wrongMatch) allMatch = false;
  }
  
  console.log(`\nAll wasGeneratedFrom checks passed: ${allMatch ? '✓' : '✗'}`);
  
  return allMatch;
}

// Test random UUID generation
function testRandomUuidGeneration() {
  console.log('\n=== Testing Random UUID Generation ===');
  
  const uuid1 = generateUuid();
  const uuid2 = generateUuid();
  
  console.log(`Generated UUID 1: ${uuid1}`);
  console.log(`Generated UUID 2: ${uuid2}`);
  console.log(`UUIDs are different: ${uuid1 !== uuid2 ? '✓' : '✗'}`);
  
  return uuid1 !== uuid2;
}

// Run all tests
async function runTests() {
  console.log('Starting UUID conversion tests');
  
  const tests = [
    { name: 'Deterministic Conversion', fn: testDeterministicConversion },
    { name: 'Original ID Tracking', fn: testOriginalIdTracking },
    { name: 'wasGeneratedFrom', fn: testWasGeneratedFrom },
    { name: 'Random UUID Generation', fn: testRandomUuidGeneration }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = test.fn();
      if (result) {
        console.log(`\n✅ ${test.name} test PASSED`);
        passed++;
      } else {
        console.log(`\n❌ ${test.name} test FAILED`);
        failed++;
      }
    } catch (error) {
      console.error(`\n❌ ${test.name} test ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
}

runTests();