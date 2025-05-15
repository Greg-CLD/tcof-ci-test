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
 * 
 * @param {string|number} numericId - The numeric ID to convert
 * @returns {string} A UUID format string derived from the numeric ID
 */
function convertNumericIdToUuid(numericId) {
  // Convert to string first
  const idStr = String(numericId);
  
  // Create a deterministic padding for the ID to ensure the same numeric ID
  // always generates the same UUID
  const paddedId = idStr.padStart(10, '0');
  
  // Insert hyphens to create UUID format
  // Using the numeric ID as part of the UUID ensures deterministic mapping
  return `${paddedId.substring(0, 8)}-${paddedId.substring(8, 10)}00-4000-8000-000000000000`;
}

module.exports = {
  isValidUUID,
  isNumericId,
  convertNumericIdToUuid
};