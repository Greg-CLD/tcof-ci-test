/* 
 * Storage adapter for plan persistence
 * Default implementation uses browser localStorage
 * Can be swapped for Replit DB by changing only this file
 */

import { PlanRecord } from './plan-db';

const KEY_PREFIX = 'tcof_plan_';

/**
 * Save a plan to storage
 * @param id The plan ID
 * @param plan The plan data
 */
function persist(id: string, plan: PlanRecord): void {
  localStorage.setItem(KEY_PREFIX + id, JSON.stringify(plan));
}

/**
 * Fetch a plan from storage
 * @param id The plan ID
 * @returns The plan data or null if not found
 */
function fetch(id: string): PlanRecord | null {
  const raw = localStorage.getItem(KEY_PREFIX + id);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Remove a plan from storage
 * @param id The plan ID
 */
function remove(id: string): void {
  localStorage.removeItem(KEY_PREFIX + id);
}

/**
 * List all plan IDs in storage
 * @returns Array of plan IDs
 */
function listIds(): string[] {
  return Object.keys(localStorage)
    .filter(k => k.startsWith(KEY_PREFIX))
    .map(k => k.replace(KEY_PREFIX, ''));
}

/**
 * Remove all plans from storage (for development/testing)
 */
function wipeAll(): void {
  Object.keys(localStorage)
    .filter(k => k.startsWith(KEY_PREFIX))
    .forEach(k => localStorage.removeItem(k));
}

/**
 * Storage adapter interface that mimics async DB operations
 * This allows for easy swapping with Replit DB or other storage solutions
 */
export const storage = {
  save: (id: string, data: PlanRecord) => Promise.resolve(persist(id, data)),
  load: (id: string) => Promise.resolve(fetch(id)),
  delete: (id: string) => Promise.resolve(remove(id)),
  list: () => Promise.resolve(listIds()),
  wipeAll: () => Promise.resolve(wipeAll())
};