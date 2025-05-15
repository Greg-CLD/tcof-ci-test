/**
 * Utility functions for client-side validation of UUIDs
 */

/**
 * Validates if a string is a proper UUID format
 * UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where x is any hexadecimal digit
 * and y is one of 8, 9, A, or B (in UUID v4)
 * 
 * @param id String to validate as UUID
 * @returns Boolean indicating if string is a valid UUID
 */
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  
  // UUID pattern validation
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_PATTERN.test(id);
}

/**
 * Filters an array of projects to only include those with valid UUID IDs
 * Use this during the migration period to filter out any legacy projects
 * with numeric IDs that haven't been migrated yet
 * 
 * @param projects Array of project objects with id property
 * @returns Filtered array with only UUID-format projects
 */
export function filterUUIDProjects<T extends { id: string }>(projects: T[]): T[] {
  return projects.filter(project => isValidUUID(project.id));
}
