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
 * Used for detecting and rejecting numeric IDs
 * 
 * @param {string|number|null|undefined} id - String or number to check
 * @returns {boolean} Boolean indicating if value is numeric
 */
function isNumericId(id) {
  if (id === null || id === undefined) return false;
  
  // Check if it's a number or a string that represents a number
  return !isNaN(Number(id)) && String(id).length < 36;
}

module.exports = {
  isValidUUID,
  isNumericId
};