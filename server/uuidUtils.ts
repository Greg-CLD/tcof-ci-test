/**
 * Utilities for handling UUIDs consistently across the application
 * Server-side version
 */
import { v4 as uuidv4 } from 'uuid';
import { v5 as uuidv5 } from 'uuid';

// Namespace for generating deterministic UUIDs
// This is a constant namespace we use for all deterministic UUID generation
const TCOF_NAMESPACE = '88c11a30-d9a5-4d97-ac16-01a9f25c2abb';

/**
 * Converts a non-UUID ID (like "sf-1") to a deterministic UUID
 * This ensures the same input always produces the same UUID output
 * 
 * @param id The non-UUID ID to convert
 * @returns A deterministic UUID based on the input ID
 */
export function convertToUuid(id: string): string {
  // If it's already a valid UUID, return it as is
  if (isValidUuid(id)) {
    return id;
  }

  // Generate a deterministic UUID using v5 (namespace)
  return uuidv5(id, TCOF_NAMESPACE);
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