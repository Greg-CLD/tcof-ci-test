/**
 * Utility functions for generating friendly task display names
 */

import { StageType } from "@/components/plan/FactorTaskEditor";

/**
 * Generates a user-friendly display name for a user heuristic task
 * 
 * @param heuristicIndex The index of the heuristic (1-based)
 * @param stage The project stage
 * @param taskIndex The index of the task within that stage and heuristic (1-based)
 * @returns A formatted display name
 */
export function getUserHeuristicTaskDisplayName(
  heuristicIndex: number,
  stage: StageType,
  taskIndex: number
): string {
  // Format: UH01 - Identification - Task 1
  const paddedIndex = String(heuristicIndex).padStart(2, '0');
  return `UH${paddedIndex} - ${stage} - Task ${taskIndex}`;
}

/**
 * Generates a user-friendly display name for a policy task
 * 
 * @param policyName The name of the policy
 * @param stage The project stage
 * @param taskIndex The index of the task within that stage and policy (1-based)
 * @returns A formatted display name
 */
export function getPolicyTaskDisplayName(
  policyName: string,
  stage: StageType,
  taskIndex: number
): string {
  // Format: Policy: Risk Process - Closure - Task 1
  return `Policy: ${policyName} - ${stage} - Task ${taskIndex}`;
}

/**
 * Determines if a task string has already been formatted with a display name
 * 
 * @param taskText The task text to check
 * @returns True if the task is already formatted
 */
export function isTaskAlreadyFormatted(taskText: string): boolean {
  // Check for UH pattern or Policy pattern
  return /^UH\d{2} - /.test(taskText) || /^Policy: .+ - .+ - Task \d+$/.test(taskText);
}