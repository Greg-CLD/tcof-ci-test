import { storage } from '@/lib/storageAdapter';

// Cache the factor data to avoid repeated file reads
let cachedFactors = null;

// Default empty set of factors
const defaultFactors = [
  {
    id: "1.1",
    title: "Ask Why",
    tasks: {
      Identification: ["Consult key stakeholders", "Understand pains and wants"],
      Definition: ["Document key business objectives"],
      Delivery: ["Verify solution alignment with objectives"],
      Closure: ["Measure outcomes against objectives"]
    }
  }
];

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

    // If not in DB, fetch from API if we're in browser
    try {
      const response = await fetch('/api/admin/tcof-tasks');
      if (response.ok) {
        const data = await response.json();
        cachedFactors = data;
        // Store in Replit DB for future access
        await storage.set('successFactors', cachedFactors);
        return cachedFactors;
      }
    } catch (fetchError) {
      console.warn('Could not fetch from API:', fetchError);
    }
    
    // Fall back to default factors if all else fails
    cachedFactors = defaultFactors;
    await storage.set('successFactors', cachedFactors);
    
    return cachedFactors;
  } catch (error) {
    console.error('Error loading success factors:', error);
    return defaultFactors;
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
    
    // Also try to save via API
    try {
      const response = await fetch('/api/admin/tcof-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFactors),
      });
      
      if (!response.ok) {
        console.warn('Failed to save to API:', await response.text());
      }
    } catch (apiError) {
      console.warn('Could not save to API:', apiError);
      // Non-fatal error, we've already saved to Replit DB
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