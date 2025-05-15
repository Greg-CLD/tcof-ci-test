/**
 * Utility functions for validating and working with UUIDs server-side
 */

/**
 * Validates if a string is a proper UUID format
 * UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where x is any hexadecimal digit
 * and y is one of 8, 9, A, or B (in UUID v4)
 * 
 * @param {string|null|undefined} id - String to validate as UUID
 * @returns {boolean} Boolean indicating if string is a valid UUID
 */
function isValidUUID(id) {
  if (!id) return false;
  
  // UUID pattern validation (RFC4122)
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_PATTERN.test(id);
}

/**
 * Checks if a value is likely a numeric ID (not a UUID)
 * 
 * @param {string|number|null|undefined} id - String or number to check
 * @returns {boolean} Boolean indicating if value is numeric
 */
function isNumericId(id) {
  if (id === null || id === undefined) return false;
  
  // Check if it's a number or a string that represents a number
  return !isNaN(Number(id)) && String(id).length < 36;
}

/**
 * Converts a numeric ID to a UUID using a deterministic algorithm
 * This helps with legacy numeric IDs during migration
 * Matches the PostgreSQL function integer_to_uuid()
 * 
 * @param {string|number} numericId - The numeric ID to convert
 * @returns {string} A UUID format string derived from the numeric ID
 */
function convertNumericIdToUuid(numericId) {
  // Convert to string first
  const idStr = String(numericId);
  
  // Convert to hexadecimal and pad to 4 characters
  // This matches our PostgreSQL function: LPAD(to_hex(int_id), 4, '0')
  const hexId = parseInt(idStr, 10).toString(16).padStart(4, '0');
  
  // Create deterministic UUID following our PostgreSQL format
  return `00000000-${hexId}-4000-8000-000000000000`;
}

module.exports = {
  isValidUUID,
  isNumericId,
  convertNumericIdToUuid
};