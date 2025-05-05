/**
 * Outcome Progress database module
 * Provides centralized outcome progress tracking and persistence
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Path to outcome progress data file
const DATA_DIR = path.join(process.cwd(), 'data');
const OUTCOME_PROGRESS_FILE = path.join(DATA_DIR, 'outcomeProgress.json');

// Outcome Progress data type
export interface OutcomeProgress {
  id: string;
  projectId: string;
  outcomeId: string;
  value: number; // 0-100
  updatedAt: string;
}

// Outcome data type (for custom outcomes)
export interface Outcome {
  id: string;
  projectId: string;
  title: string;
  level: string;
  createdAt: string;
}

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize outcome progress data file if it doesn't exist
if (!fs.existsSync(OUTCOME_PROGRESS_FILE)) {
  fs.writeFileSync(OUTCOME_PROGRESS_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('Created empty outcomeProgress.json file');
}

/**
 * Load all outcome progress entries from the data file
 */
function loadOutcomeProgress(): OutcomeProgress[] {
  try {
    const data = fs.readFileSync(OUTCOME_PROGRESS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading outcome progress:', error);
    return [];
  }
}

/**
 * Save outcome progress entries to the data file
 */
function saveOutcomeProgress(progress: OutcomeProgress[]): boolean {
  try {
    fs.writeFileSync(OUTCOME_PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving outcome progress:', error);
    return false;
  }
}

/**
 * Outcome Progress database operations
 */
export const outcomeProgressDb = {
  /**
   * Get all outcome progress entries for a project
   * @param projectId Project ID
   * @returns Array of outcome progress entries for the project
   */
  getProjectOutcomeProgress: async (projectId: string): Promise<OutcomeProgress[]> => {
    try {
      // Load all outcome progress entries
      const progress = loadOutcomeProgress();
      
      // Filter by project ID
      const projectProgress = progress.filter(p => p.projectId === projectId);
      
      return projectProgress;
    } catch (error) {
      console.error('Error getting project outcome progress:', error);
      return [];
    }
  },

  /**
   * Get latest outcome progress for a specific outcome in a project
   * @param projectId Project ID
   * @param outcomeId Outcome ID
   * @returns The latest outcome progress or null if not found
   */
  getLatestOutcomeProgress: async (
    projectId: string,
    outcomeId: string
  ): Promise<OutcomeProgress | null> => {
    try {
      // Load all outcome progress entries
      const progress = loadOutcomeProgress();
      
      // Filter by project ID and outcome ID, sort by updatedAt (newest first)
      const filtered = progress
        .filter(p => p.projectId === projectId && p.outcomeId === outcomeId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      // Return the most recent entry or null
      return filtered.length > 0 ? filtered[0] : null;
    } catch (error) {
      console.error('Error getting latest outcome progress:', error);
      return null;
    }
  },

  /**
   * Create a new outcome progress entry
   * @param projectId Project ID
   * @param outcomeId Outcome ID
   * @param value Outcome progress value (0-100)
   * @returns The created outcome progress record or null if creation failed
   */
  createOutcomeProgress: async (
    projectId: string,
    outcomeId: string,
    value: number
  ): Promise<OutcomeProgress | null> => {
    try {
      // Validate value range
      const validatedValue = Math.max(0, Math.min(100, value));
      
      // Create new outcome progress object
      const progressEntry: OutcomeProgress = {
        id: uuidv4(),
        projectId,
        outcomeId,
        value: validatedValue,
        updatedAt: new Date().toISOString()
      };

      // Load existing outcome progress entries
      const progress = loadOutcomeProgress();

      // Add new entry
      progress.push(progressEntry);

      // Save updated list
      const saved = saveOutcomeProgress(progress);
      
      if (saved) {
        console.log(`Outcome progress saved → ${progressEntry.id}`);
        return progressEntry;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating outcome progress:', error);
      return null;
    }
  },

  /**
   * Update outcome progress value
   * @param progressId Progress entry ID
   * @param value New progress value (0-100)
   * @returns The updated outcome progress record or null if update failed
   */
  updateOutcomeProgress: async (
    progressId: string,
    value: number
  ): Promise<OutcomeProgress | null> => {
    try {
      // Validate value range
      const validatedValue = Math.max(0, Math.min(100, value));
      
      // Load all outcome progress entries
      const progress = loadOutcomeProgress();
      
      // Find the index of the entry to update
      const index = progress.findIndex(p => p.id === progressId);
      
      if (index === -1) {
        return null;
      }
      
      // Update the entry
      progress[index] = {
        ...progress[index],
        value: validatedValue,
        updatedAt: new Date().toISOString()
      };
      
      // Save the updated list
      const saved = saveOutcomeProgress(progress);
      
      if (saved) {
        return progress[index];
      }
      
      return null;
    } catch (error) {
      console.error('Error updating outcome progress:', error);
      return null;
    }
  },

  /**
   * Delete all outcome progress entries for a project
   * @param projectId Project ID
   * @returns Success status
   */
  deleteProjectOutcomeProgress: async (projectId: string): Promise<boolean> => {
    try {
      // Load all outcome progress entries
      const progress = loadOutcomeProgress();
      
      // Filter out entries for the specified project
      const updatedProgress = progress.filter(p => p.projectId !== projectId);
      
      if (updatedProgress.length === progress.length) {
        // No entries were removed
        return true;
      }
      
      // Save the updated list
      return saveOutcomeProgress(updatedProgress);
    } catch (error) {
      console.error('Error deleting project outcome progress:', error);
      return false;
    }
  }
};

// Custom outcomes database file
const OUTCOMES_FILE = path.join(DATA_DIR, 'outcomes.json');

// Initialize outcomes data file if it doesn't exist
if (!fs.existsSync(OUTCOMES_FILE)) {
  fs.writeFileSync(OUTCOMES_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('Created empty outcomes.json file');
}

/**
 * Load all custom outcomes from the data file
 */
function loadOutcomes(): Outcome[] {
  try {
    const data = fs.readFileSync(OUTCOMES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading outcomes:', error);
    return [];
  }
}

/**
 * Save outcomes to the data file
 */
function saveOutcomes(outcomes: Outcome[]): boolean {
  try {
    fs.writeFileSync(OUTCOMES_FILE, JSON.stringify(outcomes, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving outcomes:', error);
    return false;
  }
}

/**
 * Custom Outcomes database operations
 */
export const outcomesDb = {
  /**
   * Get all outcomes for a project
   * @param projectId Project ID
   * @returns Array of outcomes for the project
   */
  getProjectOutcomes: async (projectId: string): Promise<Outcome[]> => {
    try {
      // Load all outcomes
      const outcomes = loadOutcomes();
      
      // Filter by project ID
      const projectOutcomes = outcomes.filter(o => o.projectId === projectId);
      
      return projectOutcomes;
    } catch (error) {
      console.error('Error getting project outcomes:', error);
      return [];
    }
  },

  /**
   * Create a new custom outcome
   * @param projectId Project ID
   * @param title Outcome title
   * @param level Outcome level (e.g., 'custom')
   * @returns The created outcome record or null if creation failed
   */
  createOutcome: async (
    projectId: string,
    title: string,
    level: string = 'custom'
  ): Promise<Outcome | null> => {
    try {
      // Create new outcome object
      const outcome: Outcome = {
        id: uuidv4(),
        projectId,
        title,
        level,
        createdAt: new Date().toISOString()
      };

      // Load existing outcomes
      const outcomes = loadOutcomes();

      // Add new outcome
      outcomes.push(outcome);

      // Save updated list
      const saved = saveOutcomes(outcomes);
      
      if (saved) {
        console.log(`Custom outcome saved → ${outcome.id}`);
        return outcome;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating custom outcome:', error);
      return null;
    }
  },

  /**
   * Delete all outcomes for a project
   * @param projectId Project ID
   * @returns Success status
   */
  deleteProjectOutcomes: async (projectId: string): Promise<boolean> => {
    try {
      // Load all outcomes
      const outcomes = loadOutcomes();
      
      // Filter out outcomes for the specified project
      const updatedOutcomes = outcomes.filter(o => o.projectId !== projectId);
      
      if (updatedOutcomes.length === outcomes.length) {
        // No outcomes were removed
        return true;
      }
      
      // Save the updated list
      return saveOutcomes(updatedOutcomes);
    } catch (error) {
      console.error('Error deleting project outcomes:', error);
      return false;
    }
  }
};