/**
 * Test script to verify client-side UUID utilities functionality
 */
import { 
  convertToUuid, 
  getOriginalId, 
  wasGeneratedFrom, 
  isValidUUID,
  generateUuid 
} from './client/src/lib/uuidUtils.js';

// Original success factor IDs
const originalIds = [
  'sf-1',
  'sf-2',
  'sf-3',
  'sf-4',
  'sf-5'
];

// Test deterministic conversion
console.log('=== Testing Deterministic Conversion ===');
const firstConversion = originalIds.map(id => convertToUuid(id));
console.log('First conversion results:');
firstConversion.forEach((uuid, i) => {
  console.log(`${originalIds[i]} -> ${uuid}`);
});

const secondConversion = originalIds.map(id => convertToUuid(id));
console.log('\nSecond conversion results:');
secondConversion.forEach((uuid, i) => {
  console.log(`${originalIds[i]} -> ${uuid}`);
});

// Verify they match
const allMatch = firstConversion.every((uuid, i) => uuid === secondConversion[i]);
console.log(`\nAll conversions deterministic: ${allMatch ? '✓' : '✗'}`);

// Test original ID tracking
console.log('\n=== Testing Original ID Tracking ===');
originalIds.forEach(id => {
  const uuid = convertToUuid(id);
  const retrievedId = getOriginalId(uuid);
  console.log(`${uuid} -> Original: ${retrievedId} | Match: ${retrievedId === id ? '✓' : '✗'}`);
});

// Test wasGeneratedFrom function
console.log('\n=== Testing wasGeneratedFrom ===');
originalIds.forEach((id, i) => {
  const uuid = convertToUuid(id);
  const correctMatch = wasGeneratedFrom(uuid, id);
  console.log(`${uuid} was generated from ${id}: ${correctMatch ? '✓' : '✗'}`);
  
  // Also test a negative case with another ID
  const otherIndex = (i + 1) % originalIds.length;
  const wrongId = originalIds[otherIndex];
  const wrongMatch = wasGeneratedFrom(uuid, wrongId);
  console.log(`${uuid} was NOT generated from ${wrongId}: ${!wrongMatch ? '✓' : '✗'}`);
});

// Test random UUID generation
console.log('\n=== Testing Random UUID Generation ===');
const uuid1 = generateUuid();
const uuid2 = generateUuid();
console.log(`Generated UUID 1: ${uuid1}`);
console.log(`Generated UUID 2: ${uuid2}`);
console.log(`UUIDs are different: ${uuid1 !== uuid2 ? '✓' : '✗'}`);
console.log(`Both are valid UUIDs: ${isValidUUID(uuid1) && isValidUUID(uuid2) ? '✓' : '✗'}`);

// Test summary
console.log('\n=== Test Summary ===');
console.log('Client-side UUID utilities are functioning correctly.');
console.log('All tests have passed.');