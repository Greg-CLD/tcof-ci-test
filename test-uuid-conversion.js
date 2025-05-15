/**
 * Test script to verify that UUID conversion works properly
 */
const { isValidUUID, isNumericId, convertNumericIdToUuid } = require('./server/utils/uuid-utils.cjs');

// Test UUID validation
console.log('UUID validation tests:');
console.log('Valid UUID? (6ba7b810-9dad-11d1-80b4-00c04fd430c8):', isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8'));
console.log('Valid UUID? (not-a-uuid):', isValidUUID('not-a-uuid'));
console.log('Valid UUID? (123):', isValidUUID('123'));
console.log('Valid UUID? (null):', isValidUUID(null));
console.log('Valid UUID? (undefined):', isValidUUID(undefined));

// Test numeric ID detection
console.log('\nNumeric ID tests:');
console.log('Is numeric? (123):', isNumericId('123'));
console.log('Is numeric? (12345):', isNumericId(12345));
console.log('Is numeric? (abc):', isNumericId('abc'));
console.log('Is numeric? (null):', isNumericId(null));
console.log('Is numeric? (undefined):', isNumericId(undefined));

// Test conversion from numeric ID to UUID
console.log('\nConversion tests:');
console.log('Convert 1 to UUID:', convertNumericIdToUuid(1));
console.log('Convert 12345 to UUID:', convertNumericIdToUuid(12345));
console.log('Convert "54321" to UUID:', convertNumericIdToUuid('54321'));

// Verify deterministic behavior (same input should always produce same output)
const uuid1 = convertNumericIdToUuid(42);
const uuid2 = convertNumericIdToUuid(42);
console.log('\nDeterministic behavior test:');
console.log('UUID for 42 (first call):', uuid1);
console.log('UUID for 42 (second call):', uuid2);
console.log('Same output?', uuid1 === uuid2);