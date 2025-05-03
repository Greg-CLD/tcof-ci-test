export interface SuccessFactor {
  id: string;
  title: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

/**
 * Gets all success factors from the JSON file or cache
 * @returns {Promise<Array<SuccessFactor>>} Array of success factor objects
 */
export function getFactors(): Promise<SuccessFactor[]>;

/**
 * Saves updated success factors to storage
 * @param {Array<SuccessFactor>} updatedFactors - The updated factors to save
 * @returns {Promise<boolean>} True if save was successful
 */
export function saveFactors(updatedFactors: SuccessFactor[]): Promise<boolean>;

/**
 * Gets a specific factor by ID
 * @param {string} factorId - The ID of the factor to retrieve
 * @returns {Promise<SuccessFactor|null>} The factor object or null if not found
 */
export function getFactorById(factorId: string): Promise<SuccessFactor | null>;

/**
 * Gets tasks for a specific factor and stage
 * @param {string} factorId - The ID of the success factor
 * @param {string} stage - The stage name (Identification, Definition, Delivery, Closure)
 * @returns {Promise<Array<string>>} Array of task strings
 */
export function getFactorTasks(factorId: string, stage: string): Promise<string[]>;

/**
 * Gets factor name by ID
 * @param {string} factorId - The ID of the success factor
 * @returns {Promise<string>} Formatted factor name with ID
 */
export function getFactorNameById(factorId: string): Promise<string>;

/**
 * Creates a new success factor
 * @param {SuccessFactor} factor - The factor data to create
 * @returns {Promise<SuccessFactor|null>} The created factor or null if operation failed
 */
export function createFactor(factor: SuccessFactor): Promise<SuccessFactor | null>;

/**
 * Updates an existing success factor
 * @param {string} factorId - ID of the factor to update
 * @param {SuccessFactor} updatedFactor - The updated factor data
 * @returns {Promise<SuccessFactor|null>} The updated factor or null if operation failed
 */
export function updateFactor(factorId: string, updatedFactor: SuccessFactor): Promise<SuccessFactor | null>;

/**
 * Deletes a success factor
 * @param {string} factorId - ID of the factor to delete
 * @returns {Promise<boolean>} True if deletion was successful
 */
export function deleteFactor(factorId: string): Promise<boolean>;