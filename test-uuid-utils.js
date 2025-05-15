/**
 * Test utilities for UUID conversion
 * This provides standalone implementation of the UUID utilities for testing
 */
const { v4: uuidv4, v5: uuidv5 } = require('uuid');

// Namespace for generating deterministic UUIDs (same as in server/uuidUtils.ts)
const TCOF_NAMESPACE = '88c11a30-d9a5-4d97-ac16-01a9f25c2abb';

// Dictionary to track original IDs for later reference
const ORIGINAL_ID_MAP = new Map();

/**
 * Converts a non-UUID ID (like "sf-1") to a deterministic UUID
 */
function convertToUuid(id, trackOriginal = true) {
  // If it's already a valid UUID, return it as is
  if (isValidUuid(id)) {
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

/**
 * Attempts to retrieve the original ID that was used to generate a UUID
 */
function getOriginalId(uuid) {
  return ORIGINAL_ID_MAP.get(uuid) || uuid;
}

/**
 * Checks if a UUID was generated from a specific original ID
 */
function wasGeneratedFrom(uuid, originalId) {
  // If we have it tracked, use our map first
  const trackedOriginal = ORIGINAL_ID_MAP.get(uuid);
  if (trackedOriginal) {
    return trackedOriginal === originalId;
  }
  
  // Otherwise, regenerate the UUID and compare
  return convertToUuid(originalId, false) === uuid;
}

/**
 * Checks if a string is a valid UUID
 */
function isValidUuid(str) {
  if (!str) return false;
  
  // UUID validation regex pattern
  const uuidPattern = 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  return uuidPattern.test(str);
}

/**
 * Generates a new random UUID
 */
function generateUuid() {
  return uuidv4();
}

module.exports = {
  convertToUuid,
  getOriginalId,
  wasGeneratedFrom,
  isValidUuid,
  generateUuid
};