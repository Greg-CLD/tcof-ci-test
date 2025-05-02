/* 
 * Storage adapter for plan persistence
 * Implementation uses browser-compatible storage adapter with localStorage fallback
 */

import { PlanRecord } from './plan-db';
import { storage as db } from './browserStorage';

const KEY_PREFIX = 'tcof_plan_';

/**
 * Save a plan to storage
 * @param id The plan ID
 * @param plan The plan data
 */
async function persist(id: string, plan: PlanRecord): Promise<void> {
  // Always save to localStorage as a backup
  localStorage.setItem(KEY_PREFIX + id, JSON.stringify(plan));
  
  // If Replit DB is available, try to save there too
  if (db) {
    try {
      await db.set(KEY_PREFIX + id, JSON.stringify(plan));
    } catch (error) {
      console.error('Error persisting to Replit DB:', error);
      // Already saved to localStorage above, so no further action needed
    }
  }
}

/**
 * Fetch a plan from storage
 * @param id The plan ID
 * @returns The plan data or null if not found
 */
async function fetch(id: string): Promise<PlanRecord | null> {
  // If Replit DB is available, try it first
  if (db) {
    try {
      const raw = await db.get(KEY_PREFIX + id);
      if (raw) {
        return JSON.parse(raw as string);
      }
    } catch (error) {
      console.error('Error fetching from Replit DB:', error);
      // Fall through to localStorage check
    }
  }
  
  // Check localStorage as fallback or if Replit DB isn't available
  const localData = localStorage.getItem(KEY_PREFIX + id);
  return localData ? JSON.parse(localData) : null;
}

/**
 * Remove a plan from storage
 * @param id The plan ID
 */
async function remove(id: string): Promise<void> {
  // Always remove from localStorage
  localStorage.removeItem(KEY_PREFIX + id);
  
  // If Replit DB is available, remove from there too
  if (db) {
    try {
      await db.delete(KEY_PREFIX + id);
    } catch (error) {
      console.error('Error deleting from Replit DB:', error);
      // Already removed from localStorage above, so no further action needed
    }
  }
}

/**
 * List all plan IDs in storage
 * @returns Array of plan IDs
 */
async function listIds(): Promise<string[]> {
  // Get IDs from localStorage
  const localIds = Object.keys(localStorage)
    .filter(k => k.startsWith(KEY_PREFIX))
    .map(k => k.replace(KEY_PREFIX, ''));
  
  // If Replit DB is available, try to get IDs from there too
  if (db) {
    try {
      const replitKeys = await db.list(KEY_PREFIX);
      const replitIds = replitKeys.map((k: string) => k.replace(KEY_PREFIX, ''));
      
      // Combine both sets of IDs, removing duplicates
      return [...new Set([...localIds, ...replitIds])];
    } catch (error) {
      console.error('Error listing from Replit DB:', error);
      // Fall back to just localStorage IDs
    }
  }
  
  return localIds;
}

/**
 * Remove all plans from storage (for development/testing)
 */
async function wipeAll(): Promise<void> {
  // Always clear from localStorage
  Object.keys(localStorage)
    .filter(k => k.startsWith(KEY_PREFIX))
    .forEach(k => localStorage.removeItem(k));
  
  // If Replit DB is available, clear from there too
  if (db) {
    try {
      const keys = await db.list(KEY_PREFIX);
      for (const key of keys) {
        await db.delete(key);
      }
    } catch (error) {
      console.error('Error wiping Replit DB:', error);
      // Already cleared localStorage above, so no further action needed
    }
  }
}

/**
 * Migrate localStorage data to Replit DB
 * This is called automatically on initial load
 */
async function migrateFromLocalStorage(): Promise<void> {
  // Skip migration if Replit DB is not available
  if (!db) {
    console.log('Replit DB not available, skipping migration.');
    return;
  }
  
  try {
    const localKeys = Object.keys(localStorage)
      .filter(k => k.startsWith(KEY_PREFIX))
      // Skip already migrated keys
      .filter(k => !localStorage.getItem(`${k}_migrated`));
    
    if (localKeys.length === 0) {
      console.log('No new data to migrate to Replit DB.');
      return;
    }

    console.log(`Migrating ${localKeys.length} plans from localStorage to Replit DB...`);
    
    for (const key of localKeys) {
      const localData = localStorage.getItem(key);
      if (localData) {
        try {
          await db.set(key, localData);
          // Mark as migrated but keep in localStorage as backup
          localStorage.setItem(`${key}_migrated`, 'true');
        } catch (err) {
          console.error(`Failed to migrate key: ${key}`, err);
        }
      }
    }
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error migrating localStorage data to Replit DB:', error);
  }
}

// Start migration process if we have a DB connection
if (db) {
  migrateFromLocalStorage();
}

/**
 * Storage adapter interface with async DB operations
 */
export const storage = {
  save: (id: string, data: PlanRecord) => persist(id, data),
  load: (id: string) => fetch(id),
  delete: (id: string) => remove(id),
  list: () => listIds(),
  wipeAll: () => wipeAll()
};