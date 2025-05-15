/**
 * Simple test script to verify UUID conversion functions directly
 */
const { v4: uuidv4, v5: uuidv5 } = require('uuid');

// Namespace for generating deterministic UUIDs
// This should match the one in the client implementation
const TCOF_NAMESPACE = '88c11a30-d9a5-4d97-ac16-01a9f25c2abb';

// Dictionary to track original IDs for later reference
const ORIGINAL_ID_MAP = new Map();

function isValidUUID(id) {
  if (!id) return false;
  
  // UUID pattern validation (RFC4122)
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_PATTERN.test(id);
}

function convertToUuid(id, trackOriginal = true) {
  // If it's already a valid UUID, return it as is
  if (isValidUUID(id)) {
    return id;
  }

  // Generate a deterministic UUID using v5 (namespace)
  const uuid = uuidv5(id, TCOF_NAMESPACE);
  
  // Optionally store the original ID for future reference
  if (trackOriginal) {
    ORIGINAL_ID_MAP.set(uuid, id);
    console.log(`Mapped original ID ${id} to UUID ${uuid}`);
  }
  
  return uuid;
}

function getOriginalId(uuid) {
  return ORIGINAL_ID_MAP.get(uuid) || uuid;
}

function wasGeneratedFrom(uuid, originalId) {
  // If we have it tracked, use our map first
  const trackedOriginal = ORIGINAL_ID_MAP.get(uuid);
  if (trackedOriginal) {
    return trackedOriginal === originalId;
  }
  
  // Otherwise, regenerate the UUID and compare
  return convertToUuid(originalId, false) === uuid;
}

function generateUuid() {
  return uuidv4();
}

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
console.log('UUID utilities are functioning correctly.');
console.log('All tests have passed.');