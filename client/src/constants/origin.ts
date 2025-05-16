/**
 * Task Origin Types and Constants
 * 
 * This file contains standardized labels and values for task origins
 * to ensure consistent terminology across the application.
 */

// Define the available origin types as a union type for type safety
export type TaskOrigin = 'custom' | 'heuristic' | 'factor' | 'policy' | 'framework';

// User-friendly labels for origin types
export const ORIGIN_LABELS: Record<TaskOrigin, string> = {
  custom: 'General',
  heuristic: 'Your Heuristic',
  factor: 'TCOF Success Factor',
  policy: 'Policy',
  framework: 'Good Practice'
};

// Default origin to use when creating new tasks
export const DEFAULT_ORIGIN: TaskOrigin = 'custom';

// List of available origin types for selection in dropdowns
export const AVAILABLE_ORIGINS: TaskOrigin[] = [
  'custom',
  'heuristic',
  'factor',
  'policy',
  'framework'
];

// Mapping between origin values and CSS classes for styling
export const ORIGIN_CLASSES: Record<TaskOrigin, string> = {
  custom: 'bg-gray-100 text-gray-800 border-gray-200',
  heuristic: 'bg-blue-100 text-blue-800 border-blue-200',
  factor: 'bg-green-100 text-green-800 border-green-200',
  policy: 'bg-amber-100 text-amber-800 border-amber-200',
  framework: 'bg-purple-100 text-purple-800 border-purple-200'
};