/**
 * TypeScript declarations for factorLoader
 */

/**
 * Task data structure for a specific stage
 */
export interface TasksByStage {
  Identification: string[];
  Definition: string[];
  Delivery: string[];
  Closure: string[];
}

/**
 * Success Factor structure loaded from Excel
 */
export interface TCOFFactor {
  id: string;
  title: string;
  tasks: TasksByStage;
}

/**
 * Loads TCOF success factors from Excel file
 * @returns Promise resolving to an array of factor objects with tasks by stage
 */
export function loadFactors(): Promise<TCOFFactor[]>;

/**
 * Validates that the rendered factors in the UI match the loaded factors
 * @param renderedTitles Array of titles displayed in the UI
 * @returns True if titles match, false otherwise
 */
export function validateFactorTitles(renderedTitles: string[]): boolean;

/**
 * Validates that the number of tasks in the UI matches the expected count
 * @param stage The stage to validate tasks for
 * @param renderedCount Number of tasks displayed in the UI
 * @returns True if task counts match, false otherwise
 */
export function validateTaskCount(stage: string, renderedCount: number): boolean;