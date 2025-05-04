/**
 * Utilities for formatting and displaying task names
 */
import { Stage } from '@/lib/plan-db';

/**
 * Formats a task display name for heuristic tasks
 * @param text The task text
 * @param index The index number for the task
 * @param stage The stage the task belongs to
 * @returns Formatted task name
 */
export function formatHeuristicTaskName(text: string, index: number, stage: Stage): string {
  return `UH${String(index).padStart(2, '0')} - ${stage} - Task ${index + 1}: ${text}`;
}

/**
 * Formats a task display name for success factor tasks
 * @param text The task text
 * @param index The index number for the task
 * @param stage The stage the task belongs to
 * @returns Formatted task name
 */
export function formatFactorTaskName(text: string, index: number, stage: Stage): string {
  return `SF${String(index).padStart(2, '0')} - ${stage} - Task ${index + 1}: ${text}`;
}

/**
 * Formats a task display name for policy/framework tasks
 * @param text The task text
 * @param frameworkName The name of the framework or policy
 * @param index The index number for the task
 * @param stage The stage the task belongs to
 * @returns Formatted task name
 */
export function formatFrameworkTaskName(
  text: string, 
  frameworkName: string, 
  index: number, 
  stage: Stage
): string {
  const code = frameworkName.substring(0, 3).toUpperCase();
  return `${code}${String(index).padStart(2, '0')} - ${stage} - Task ${index + 1}: ${text}`;
}

/**
 * Extracts the core task name from a fully formatted display name
 * @param displayName The formatted task display name
 * @returns The core task text without prefixes and codes
 */
export function extractCoreTaskName(displayName: string): string {
  // Pattern for tasks with format: CODE## - Stage - Task #: Actual Text
  const standardPattern = /^(?:.+) - (?:.+) - Task (?:\d+): (.+)$/;
  const standardMatch = displayName.match(standardPattern);
  
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1];
  }
  
  // Alternative pattern for policy tasks or other formats
  const policyPattern = /^Policy: (.+) - (?:.+) - Task (?:\d+)$/;
  const policyMatch = displayName.match(policyPattern);
  
  if (policyMatch && policyMatch[1]) {
    return policyMatch[1];
  }
  
  // If no pattern matches, return the original string
  return displayName;
}

/**
 * Formats a task name for display in the UI with improved readability
 * @param taskName The full task name
 * @returns Formatted, user-friendly task name
 */
export function formatTaskForDisplay(taskName: string): string {
  return extractCoreTaskName(taskName);
}

/**
 * Extracts the stage from a formatted task name
 * @param taskName The formatted task name
 * @returns The stage name or undefined if not found
 */
export function extractStageFromTaskName(taskName: string): Stage | undefined {
  const pattern = /^(?:.+) - (Identification|Definition|Delivery|Closure) - Task (?:\d+)/;
  const match = taskName.match(pattern);
  
  if (match && match[1]) {
    return match[1] as Stage;
  }
  
  return undefined;
}

/**
 * Extracts the task code (prefix) from a formatted task name
 * @param taskName The formatted task name
 * @returns The task code or undefined if not found
 */
export function extractTaskCode(taskName: string): string | undefined {
  const pattern = /^([A-Z0-9]+) - (?:.+) - Task (?:\d+)/;
  const match = taskName.match(pattern);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return undefined;
}

/**
 * Checks if a task name is already formatted according to our display conventions
 * @param taskName The task name to check
 * @returns Whether the task name is already formatted
 */
export function isTaskAlreadyFormatted(taskName: string): boolean {
  const standardPattern = /^(?:[A-Z0-9]+) - (?:.+) - Task (?:\d+): (?:.+)$/;
  const policyPattern = /^Policy: (?:.+) - (?:.+) - Task (?:\d+)$/;
  
  return standardPattern.test(taskName) || policyPattern.test(taskName);
}

/**
 * Formats a heuristic task display name for a specific heuristic, stage, and task index
 * @param heuristicIndex The index of the heuristic
 * @param stage The stage the task belongs to
 * @param taskIndex The index of the task within the stage
 * @returns Formatted task name
 */
export function getUserHeuristicTaskDisplayName(
  heuristicIndex: number,
  stage: Stage,
  taskIndex: number
): string {
  return `UH${String(heuristicIndex).padStart(2, '0')} - ${stage} - Task ${taskIndex + 1}: Fill in task`;
}

/**
 * Formats a policy task display name
 * @param policyName The name of the policy
 * @param stage The stage the task belongs to
 * @param taskIndex The index of the task within the stage
 * @returns Formatted task name
 */
export function getPolicyTaskDisplayName(
  policyName: string,
  stage: Stage,
  taskIndex: number
): string {
  return `Policy: ${policyName} - ${stage} - Task ${taskIndex + 1}`;
}