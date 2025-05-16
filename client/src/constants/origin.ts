/**
 * Constants for task origin types and their user-friendly labels
 */

// Origin type definition (matches the database schema)
export type TaskOrigin = 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';

// Mapping of origin values to user-friendly display labels
export const ORIGIN_LABELS: Record<TaskOrigin, string> = {
  heuristic: 'Your Heuristic',
  factor: 'TCOF Success Factor',
  policy: 'Policy',
  custom: 'General',
  framework: 'Good Practice'
};

// Default origin to use when creating new tasks
export const DEFAULT_ORIGIN: TaskOrigin = 'custom';

// List of all available origins for selection in forms
export const AVAILABLE_ORIGINS: TaskOrigin[] = [
  'custom',   // General
  'heuristic', // Your Heuristic
  'factor',    // TCOF Success Factor
  'policy',    // Policy
  'framework'  // Good Practice
];

/**
 * Get a user-friendly label for an origin value
 * 
 * @param origin The origin value
 * @returns The user-friendly label
 */
export function getOriginLabel(origin: TaskOrigin): string {
  return ORIGIN_LABELS[origin] || 'General';
}