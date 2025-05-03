import { storage } from '@/lib/storageAdapter';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Cache the factor data to avoid repeated file reads
let cachedFactors = null;

/**
 * Gets all success factors from the JSON file or cache
 * @returns {Promise<Array>} Array of success factor objects
 */
export async function getFactors() {
  if (cachedFactors) {
    return cachedFactors;
  }

  try {
    // First try to load from Replit DB
    const dbFactors = await storage.get('successFactors');
    if (dbFactors) {
      cachedFactors = dbFactors;
      return dbFactors;
    }

    // If not in DB, load from JSON file
    // Dynamic import to load JSON data at runtime
    const factorsData = await import('../../data/successFactors.json', { assert: { type: 'json' } });
    cachedFactors = factorsData.default;
    
    // Store in Replit DB for future access
    await storage.set('successFactors', cachedFactors);
    
    return cachedFactors;
  } catch (error) {
    console.error('Error loading success factors:', error);
    return [];
  }
}

/**
 * Saves updated success factors to storage
 * @param {Array} updatedFactors - The updated factors to save
 * @returns {Promise<boolean>} True if save was successful
 */
export async function saveFactors(updatedFactors) {
  try {
    // Update the cache
    cachedFactors = updatedFactors;
    
    // Save to Replit DB
    await storage.set('successFactors', updatedFactors);
    
    // Try to save to file system in development mode
    if (import.meta.env.DEV) {
      try {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const jsonPath = path.resolve(__dirname, '../../data/successFactors.json');
        await fs.writeFile(jsonPath, JSON.stringify(updatedFactors, null, 2));
      } catch (fsError) {
        console.warn('Could not save to file system:', fsError);
        // Non-fatal error, we've already saved to Replit DB
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error saving success factors:', error);
    return false;
  }
}

/**
 * Gets a specific factor by ID
 * @param {string} factorId - The ID of the factor to retrieve
 * @returns {Promise<Object|null>} The factor object or null if not found
 */
export async function getFactorById(factorId) {
  const factors = await getFactors();
  return factors.find(factor => factor.id === factorId) || null;
}

/**
 * Gets tasks for a specific factor and stage
 * @param {string} factorId - The ID of the success factor
 * @param {string} stage - The stage name (Identification, Definition, Delivery, Closure)
 * @returns {Promise<Array<string>>} Array of task strings
 */
export async function getFactorTasks(factorId, stage) {
  const factor = await getFactorById(factorId);
  
  if (!factor || !factor.tasks || !factor.tasks[stage]) {
    return [];
  }
  
  return factor.tasks[stage];
}

/**
 * Gets factor name by ID
 * @param {string} factorId - The ID of the success factor
 * @returns {Promise<string>} Formatted factor name with ID
 */
export async function getFactorNameById(factorId) {
  try {
    const factor = await getFactorById(factorId);
    return factor ? `${factor.id}: ${factor.title}` : factorId;
  } catch (error) {
    console.error('Error getting factor name by ID:', error);
    return factorId;
  }
}