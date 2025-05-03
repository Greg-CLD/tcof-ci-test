/**
 * Excel-based loader for TCOF success factors
 * Reads directly from the tcof_factors.xlsx file and parses it into a structured format
 */
import * as XLSX from 'xlsx';

// Constants for Excel column mapping
const SHEET_NAME = 'Sheet1';
const COLUMN_MAPPING = {
  TITLE: 0,        // Column A - Title
  IDENTIFICATION: 1, // Column B - Identification
  DEFINITION: 2,     // Column C - Definition
  DELIVERY: 3,       // Column D - Delivery
  CLOSURE: 4         // Column E - Closure
};

const CACHE_KEY = 'tcof_factors_cache';
const TIMESTAMP_KEY = 'tcof_factors_timestamp';

/**
 * Loads TCOF success factors from Excel file
 * @returns {Promise<Array>} Array of factor objects with tasks by stage
 */
export async function loadFactors() {
  try {
    // Check if we have cached data that's still valid
    const cachedData = checkCache();
    if (cachedData) {
      console.info('✅ Using cached factors data');
      return cachedData;
    }

    console.info('📊 Loading factors from Excel...');
    
    // Fetch the Excel file
    const response = await fetch('/attached_assets/tcof_factors.xlsx');
    if (!response.ok) {
      throw new Error(`Failed to fetch Excel file: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first sheet
    const worksheet = workbook.Sheets[SHEET_NAME];
    if (!worksheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found in workbook`);
    }
    
    // Convert sheet to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Skip header row (first row)
    const dataRows = rawData.slice(1);
    
    // Process rows into structured format
    const factors = dataRows.map((row, index) => {
      // For auto-numbering if needed
      const factorId = `${Math.floor(index / 2) + 1}.${(index % 2) + 1}`;
      
      // Get the title from column A, trim whitespace
      const title = row[COLUMN_MAPPING.TITLE]?.toString().trim() || '';
      
      // Extract tasks for each stage
      const tasks = {
        Identification: extractTasks(row[COLUMN_MAPPING.IDENTIFICATION]),
        Definition: extractTasks(row[COLUMN_MAPPING.DEFINITION]),
        Delivery: extractTasks(row[COLUMN_MAPPING.DELIVERY]),
        Closure: extractTasks(row[COLUMN_MAPPING.CLOSURE])
      };
      
      return { id: factorId, title, tasks };
    }).filter(factor => factor.title); // Filter out empty rows
    
    // Cache the results
    cacheResults(factors);
    
    // Attach to window for dev-time validation
    if (typeof window !== 'undefined') {
      window.__tcof_factors = factors;
    }
    
    // Log statistics for the loaded data
    const taskTotal = factors.reduce((total, factor) => {
      return total + 
        factor.tasks.Identification.length +
        factor.tasks.Definition.length +
        factor.tasks.Delivery.length +
        factor.tasks.Closure.length;
    }, 0);
    
    console.info('✅ Factors loaded from Excel', { 
      factorCount: factors.length, 
      taskTotal 
    });
    
    return factors;
  } catch (error) {
    console.error('Error loading factors from Excel:', error);
    // In case of error, try to return cached data even if expired
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        console.warn('⚠️ Using expired cache due to Excel load failure');
        return parsedData;
      } catch (parseError) {
        console.error('Error parsing cached data:', parseError);
      }
    }
    
    // If all else fails, return an empty array
    return [];
  }
}

/**
 * Helper function to extract and clean tasks from a cell
 * @param {string} cellValue - The raw cell value
 * @returns {Array<string>} Array of task strings
 */
function extractTasks(cellValue) {
  if (!cellValue) return [];
  
  // Convert to string and split by newlines
  const tasks = cellValue.toString()
    .split(/\\n|\\r\\n|\\r|[\\n]/)  // Split on various newline formats
    .map(task => task.trim())
    .filter(task => task.length > 0);
  
  return tasks;
}

/**
 * Checks if we have valid cached data
 * @returns {Array|null} The cached data or null if invalid/expired
 */
function checkCache() {
  try {
    const timestamp = localStorage.getItem(TIMESTAMP_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);
    
    if (!timestamp || !cachedData) return null;
    
    // Parse the timestamp and check if it's still valid (1 hour cache)
    const parsedTimestamp = parseInt(timestamp, 10);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (now - parsedTimestamp > oneHour) {
      // Cache expired
      return null;
    }
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('Error checking cache:', error);
    return null;
  }
}

/**
 * Caches the factors data with a timestamp
 * @param {Array} factors - The factors data to cache
 */
function cacheResults(factors) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(factors));
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error caching factors data:', error);
  }
}

/**
 * Validates that the rendered factors in the UI match the loaded factors
 * @param {Array<string>} renderedTitles - Array of titles displayed in the UI
 * @returns {boolean} True if titles match, false otherwise
 */
export function validateFactorTitles(renderedTitles) {
  if (typeof window === 'undefined' || !window.__tcof_factors) {
    console.warn('⚠️ Cannot validate factor titles - reference data not available');
    return true;
  }
  
  const expectedTitles = window.__tcof_factors.map(f => f.title);
  
  // Basic length check
  if (renderedTitles.length !== expectedTitles.length) {
    console.error('💥 Title mismatch between spreadsheet and UI', {
      expectedCount: expectedTitles.length,
      renderedCount: renderedTitles.length
    });
    return false;
  }
  
  // Compare each title
  for (let i = 0; i < renderedTitles.length; i++) {
    if (renderedTitles[i] !== expectedTitles[i]) {
      console.error('💥 Title mismatch between spreadsheet and UI', {
        index: i,
        expected: expectedTitles[i],
        rendered: renderedTitles[i]
      });
      return false;
    }
  }
  
  return true;
}

/**
 * Validates that the number of tasks in the UI matches the expected count
 * @param {string} stage - The stage to validate tasks for
 * @param {number} renderedCount - Number of tasks displayed in the UI
 * @returns {boolean} True if task counts match, false otherwise
 */
export function validateTaskCount(stage, renderedCount) {
  if (typeof window === 'undefined' || !window.__tcof_factors) {
    console.warn('⚠️ Cannot validate task count - reference data not available');
    return true;
  }
  
  // Count all tasks for the specified stage
  const expectedCount = window.__tcof_factors.reduce((count, factor) => {
    return count + (factor.tasks[stage]?.length || 0);
  }, 0);
  
  if (renderedCount !== expectedCount) {
    console.error(`💥 Task count mismatch for stage ${stage}`, {
      expectedCount,
      renderedCount
    });
    return false;
  }
  
  return true;
}