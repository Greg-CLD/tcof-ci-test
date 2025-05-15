/**
 * Utilities for handling UUIDs consistently across the application
 * Client-side version
 */
import { v4 as uuidv4 } from 'uuid';
import { v5 as uuidv5 } from 'uuid';

// Namespace for generating deterministic UUIDs
// This is a constant namespace we use for all deterministic UUID generation
// IMPORTANT: This MUST match the server-side namespace value
const TCOF_NAMESPACE = '88c11a30-d9a5-4d97-ac16-01a9f25c2abb';

// Dictionary to track original IDs for later reference
// This is an in-memory cache that allows us to retrieve original IDs
// from deterministic UUIDs when needed for backward compatibility
const ORIGINAL_ID_MAP = new Map<string, string>();

/**
 * Converts a non-UUID ID (like "sf-1") to a deterministic UUID
 * This ensures the same input always produces the same UUID output
 * 
 * @param id The non-UUID ID to convert
 * @param trackOriginal Whether to track the original ID (default: true)
 * @returns A deterministic UUID based on the input ID
 */
export function convertToUuid(id: string, trackOriginal = true): string {
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
 * 
 * @param uuid The UUID to look up
 * @returns The original ID if found, or the UUID itself if not found
 */
export function getOriginalId(uuid: string): string {
  return ORIGINAL_ID_MAP.get(uuid) || uuid;
}

/**
 * Checks if a UUID was generated from a specific original ID
 * 
 * @param uuid The UUID to check
 * @param originalId The original ID to check against
 * @returns True if the UUID was generated from the originalId, false otherwise
 */
export function wasGeneratedFrom(uuid: string, originalId: string): boolean {
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
 * 
 * @param str The string to check
 * @returns True if the string is a valid UUID, false otherwise
 */
export function isValidUuid(str: string): boolean {
  if (!str) return false;
  
  // UUID validation regex pattern
  const uuidPattern = 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  return uuidPattern.test(str);
}

/**
 * Generates a new random UUID
 * 
 * @returns A new UUID v4
 */
export function generateUuid(): string {
  return uuidv4();
}

/**
 * Safe version of convertToUuid that handles null/undefined inputs
 * 
 * @param id The ID to convert or undefined/null
 * @returns A UUID or undefined if the input was undefined/null
 */
export function safeConvertToUuid(id: string | undefined | null): string | undefined {
  if (!id) return undefined;
  return convertToUuid(id);
}