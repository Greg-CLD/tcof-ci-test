/**
 * Test script to verify that UUID validation works properly
 * 
 * Note: The conversion functionality has been removed as part of
 * the complete UUID migration. The application now only supports
 * UUID format identifiers and rejects numeric IDs completely.
 */
const { isValidUUID, isNumericId } = require('./server/utils/uuid-utils.cjs');

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

// Print message about removed conversion functionality
console.log('\nNOTE: Numeric ID to UUID conversion has been removed.');
console.log('The application now only supports UUID format identifiers.');
console.log('Any numeric IDs are rejected at all levels (URL, API, context).');