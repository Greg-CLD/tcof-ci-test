/**
 * Utility functions for validating and working with UUIDs
 */
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

/**
 * Validates if a string is a proper UUID format
 * UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where x is any hexadecimal digit
 * and y is one of 8, 9, A, or B (in UUID v4)
 * 
 * @param id String to validate as UUID
 * @returns Boolean indicating if string is a valid UUID
 */
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  
  // UUID pattern validation (RFC4122)
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_PATTERN.test(id);
}

/**
 * Checks if a value is likely a numeric ID (not a UUID)
 * Used for detecting and rejecting numeric IDs
 * 
 * @param id String or number to check
 * @returns Boolean indicating if value is numeric
 */
export function isNumericId(id: string | number | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  
  // Check if it's a number or a string that represents a number
  return !isNaN(Number(id)) && String(id).length < 36;
}

/**
 * Filters an array of projects to only include those with valid UUID IDs
 * 
 * @param projects Array of project objects with id property
 * @returns Filtered array with only UUID-format projects
 */
export function filterUUIDProjects<T extends { id: string }>(projects: T[]): T[] {
  return projects.filter(project => isValidUUID(project.id));
}