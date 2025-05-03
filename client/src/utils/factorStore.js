import { storage } from '@/lib/storageAdapter';
import { apiRequest } from '@/lib/queryClient';

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
 * Ensures we have exactly 12 unique success factors
 * @param {Array} factors - Array of success factors
 * @returns {Array} 12 unique success factors
 */
function ensureUnique12Factors(factors) {
  if (!factors || factors.length === 0) {
    console.error('No factors found, returning default');
    return defaultFactors;
  }
  
  // Enforce 12 unique factors by deduplicating based on titles
  const uniqueMap = {};
  
  // First pass - get unique factors by title
  factors.forEach(factor => {
    const title = factor.title.trim();
    if (!uniqueMap[title] || factor.id.startsWith("sf-")) {
      uniqueMap[title] = factor;
    }
  });
  
  // Get unique values
  const uniqueFactors = Object.values(uniqueMap);
  
  // If we have more than 12, trim to first 12
  if (uniqueFactors.length > 12) {
    console.warn(`⚠ Too many unique factors (${uniqueFactors.length}), trimming to 12`);
    return uniqueFactors.slice(0, 12);
  }
  
  // If we have exactly 12, perfect!
  if (uniqueFactors.length === 12) {
    return uniqueFactors;
  }
  
  // If we have less than 12, fill with defaults (this should rarely happen)
  if (uniqueFactors.length < 12) {
    console.warn(`⚠ Too few unique factors (${uniqueFactors.length}), adding defaults to reach 12`);
    const extraNeeded = 12 - uniqueFactors.length;
    const defaultsToAdd = defaultFactors.slice(0, extraNeeded).map((factor, idx) => ({
      ...factor,
      id: `missing-${idx + 1}`,
      title: `Default Factor ${idx + 1}`
    }));
    
    return [...uniqueFactors, ...defaultsToAdd];
  }
}

/**
 * Gets all success factors from the JSON file or cache
 * @param {boolean} bypassCache - Whether to bypass the cache
 * @param {boolean} enforceUnique - Whether to enforce 12 unique factors
 * @returns {Promise<Array>} Array of success factor objects
 */
export async function getFactors(bypassCache = false, enforceUnique = true) {
  if (cachedFactors && !bypassCache) {
    // Even when using cache, enforce 12 unique factors if requested
    return enforceUnique ? ensureUnique12Factors(cachedFactors) : cachedFactors;
  }

  try {
    // First try to load from API using the new endpoint
    try {
      const response = await apiRequest('GET', '/api/admin/success-factors');
      if (response.ok) {
        const data = await response.json();
        
        // Apply uniqueness enforcement if requested
        const processedData = enforceUnique ? ensureUnique12Factors(data) : data;
        cachedFactors = processedData;
        
        // Check if we have the expected 12 factors
        if (data.length !== 12) {
          console.warn(`⚠ Unexpected factor count: ${data.length} (expected 12). Consider running deduplication.`);
        }
        
        // Store in local cache for future access
        await storage.set('successFactors', cachedFactors);
        return cachedFactors;
      }
    } catch (fetchError) {
      console.warn('Could not fetch from new API endpoint:', fetchError);
      
      // Fall back to old API endpoint
      try {
        const response = await apiRequest('GET', '/api/admin/tcof-tasks');
        if (response.ok) {
          const data = await response.json();
          
          // Apply uniqueness enforcement if requested
          const processedData = enforceUnique ? ensureUnique12Factors(data) : data;
          cachedFactors = processedData;
          
          // Check if we have the expected 12 factors
          if (data.length !== 12) {
            console.warn(`⚠ Unexpected factor count: ${data.length} (expected 12). Consider running deduplication.`);
          }
          
          // Store in local cache for future access
          await storage.set('successFactors', cachedFactors);
          return cachedFactors;
        }
      } catch (oldApiError) {
        console.warn('Could not fetch from old API endpoint:', oldApiError);
      }
    }
    
    // If API fails, try to load from local storage
    const dbFactors = await storage.get('successFactors');
    if (dbFactors && dbFactors.length > 0) {
      // Apply uniqueness enforcement if requested
      const processedData = enforceUnique ? ensureUnique12Factors(dbFactors) : dbFactors;
      cachedFactors = processedData;
      
      // Check if we have the expected 12 factors
      if (dbFactors.length !== 12) {
        console.warn(`⚠ Unexpected factor count: ${dbFactors.length} (expected 12). Consider running deduplication.`);
      }
      
      return cachedFactors;
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
    
    // Save to local storage
    await storage.set('successFactors', updatedFactors);
    
    // Save via new API endpoint
    try {
      // Save all factors as a batch through the tcof-tasks endpoint
      const response = await apiRequest('POST', '/api/admin/tcof-tasks', updatedFactors);
      
      if (!response.ok) {
        console.warn('Failed to save to API:', await response.text());
      }
    } catch (apiError) {
      console.warn('Could not save to API:', apiError);
      // Non-fatal error, we've already saved to localStorage
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
  try {
    // Try to get single factor from the API first
    const response = await apiRequest('GET', `/api/admin/success-factors/${factorId}`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn(`Could not fetch factor ${factorId} from API:`, error);
  }
  
  // Fall back to getting the factor from the cached/local factors
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

/**
 * Creates a new success factor
 * @param {Object} factor - The factor data to create
 * @returns {Promise<Object|null>} The created factor or null if operation failed
 */
export async function createFactor(factor) {
  try {
    const response = await apiRequest('POST', '/api/admin/success-factors', factor);
    
    if (response.ok) {
      const createdFactor = await response.json();
      
      // Update the local cache
      const currentFactors = await getFactors();
      cachedFactors = [...currentFactors, createdFactor];
      await storage.set('successFactors', cachedFactors);
      
      return createdFactor;
    } else {
      console.error('Failed to create factor:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('Error creating factor:', error);
    return null;
  }
}

/**
 * Updates an existing success factor
 * @param {string} factorId - ID of the factor to update
 * @param {Object} updatedFactor - The updated factor data
 * @returns {Promise<Object|null>} The updated factor or null if operation failed
 */
export async function updateFactor(factorId, updatedFactor) {
  try {
    const response = await apiRequest('PUT', `/api/admin/success-factors/${factorId}`, updatedFactor);
    
    if (response.ok) {
      const savedFactor = await response.json();
      
      // Update the local cache
      const currentFactors = await getFactors();
      cachedFactors = currentFactors.map(f => 
        f.id === factorId ? savedFactor : f
      );
      await storage.set('successFactors', cachedFactors);
      
      return savedFactor;
    } else {
      console.error('Failed to update factor:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('Error updating factor:', error);
    return null;
  }
}

/**
 * Deletes a success factor
 * @param {string} factorId - ID of the factor to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
export async function deleteFactor(factorId) {
  try {
    const response = await apiRequest('DELETE', `/api/admin/success-factors/${factorId}`);
    
    if (response.ok) {
      // Update the local cache
      const currentFactors = await getFactors();
      cachedFactors = currentFactors.filter(f => f.id !== factorId);
      await storage.set('successFactors', cachedFactors);
      
      return true;
    } else {
      console.error('Failed to delete factor:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error deleting factor:', error);
    return false;
  }
}