/**
 * Utility functions for loading TCOF data consistently across components
 */
import tcofTasksRaw from '../../data/tcofTasks.json';
import presetHeuristicsRaw from '../../data/presetHeuristics.json';
import deliveryZonesRaw from '../../data/deliveryZones.json';
import tcofFactorsRaw from '../../data/tcofFactors.json';

// Types for TCOF data
export interface TCOFTask {
  id: string;
  text: string;
  stage: 'Identification' | 'Definition' | 'Delivery' | 'Closure';
  impact: 'low' | 'medium' | 'high';
}

export interface TCOFFactorTask {
  id: string;
  title: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

export interface PresetHeuristic {
  id: string;
  text: string;
  notes: string;
}

export interface DeliveryZone {
  zone: string;
  alias: string;
  summary: string;
  methods: string[];
  tools: string[];
}

// Function to load TCOF success factor tasks with proper error handling
export async function loadTCOFTasks(): Promise<TCOFTask[]> {
  try {
    // First attempt to load from API
    const response = await fetch('/api/admin/tcof-tasks');
    if (response.ok) {
      return await response.json();
    }
    
    // If API fails, use local data
    console.warn('Failed to load TCOF tasks from API, using local JSON data');
    return tcofTasksRaw;
  } catch (error) {
    console.error('Error loading TCOF tasks:', error);
    return tcofTasksRaw;
  }
}

// Function to load preset heuristics with proper error handling
export async function loadPresetHeuristics(): Promise<PresetHeuristic[]> {
  try {
    // First attempt to load from API
    const response = await fetch('/api/admin/preset-heuristics');
    if (response.ok) {
      return await response.json();
    }
    
    // If API fails, use local data
    console.warn('Failed to load preset heuristics from API, using local JSON data');
    return presetHeuristicsRaw;
  } catch (error) {
    console.error('Error loading preset heuristics:', error);
    return presetHeuristicsRaw;
  }
}

// Function to load delivery zones with proper error handling
export async function loadDeliveryZones(): Promise<DeliveryZone[]> {
  // Currently only loaded from local data, but we could add API support in the future
  return deliveryZonesRaw;
}

// Function to load TCOF factors from the API
export async function loadTCOFFactors(): Promise<TCOFFactorTask[]> {
  try {
    // First attempt to load from API
    const response = await fetch('/api/admin/success-factors');
    if (response.ok) {
      const factors = await response.json();
      // Cache the factors for use in synchronous functions
      window._cachedFactors = factors;
      return factors;
    }
    
    // If API fails, use local data
    console.warn('Failed to load TCOF factors from API, using local JSON data');
    return tcofFactorsRaw;
  } catch (error) {
    console.error('Error loading TCOF factors:', error);
    return tcofFactorsRaw;
  }
}

// Function to get success factor ratings with emoji descriptions
export function getSuccessFactorRatingInfo(): Record<number, { emoji: string; description: string }> {
  return {
    1: { emoji: '❌', description: "Doesn't land – I don't feel this. It doesn't match my experience." },
    2: { emoji: '🤔', description: "Unfamiliar – I understand it, but I've never used it in action." },
    3: { emoji: '🟡', description: "Seems true – I believe it's useful, but I haven't tested it myself." },
    4: { emoji: '✅', description: "Proven – I've used this and it worked. It fits how I lead." },
    5: { emoji: '🔥', description: "Hard-won truth – I've lived this. It's burned into how I work." }
  };
}

// Helper function to convert TCOF tasks to select options for dropdowns
export function getTcofFactorOptions(): Array<{ value: string; label: string }> {
  try {
    // First check if we have cached factors from the API
    if (window._cachedFactors && window._cachedFactors.length > 0) {
      return window._cachedFactors.map((factor: TCOFFactorTask) => ({
        value: factor.id,
        label: `${factor.id}: ${factor.title}`
      }));
    }
    
    // Fallback to using the local JSON data
    return tcofFactorsRaw.map((factor: TCOFFactorTask) => ({
      value: factor.id,
      label: `${factor.id}: ${factor.title}`
    }));
  } catch (error) {
    console.error('Error generating TCOF factor options:', error);
    // Return empty array as fallback
    return [];
  }
}

// Helper function to get factor name by ID
export function getFactorNameById(factorId: string): string {
  try {
    // First check if we have cached factors from the API
    if (window._cachedFactors && window._cachedFactors.length > 0) {
      const factor = window._cachedFactors.find(f => f.id === factorId);
      if (factor) {
        return `${factor.id}: ${factor.title}`;
      }
    }
    
    // Fallback to the local JSON data
    const factor = tcofFactorsRaw.find((f: TCOFFactorTask) => f.id === factorId);
    if (factor) {
      return `${factor.id}: ${factor.title}`;
    }
    
    // Last resort, look in the old format
    const oldFormatFactor = tcofTasksRaw.find((task: TCOFTask) => task.id === factorId);
    return oldFormatFactor ? `${oldFormatFactor.id}: ${oldFormatFactor.text}` : factorId;
  } catch (error) {
    console.error('Error getting factor name by ID:', error);
    return factorId;
  }
}

// Helper function to get tasks for a specific factor and stage
export function getFactorTasks(factorId: string, stage: string): string[] {
  try {
    // First check if we have cached factors from the API
    if (window._cachedFactors && window._cachedFactors.length > 0) {
      const factor = window._cachedFactors.find(f => f.id === factorId);
      if (factor && factor.tasks && factor.tasks[stage as keyof typeof factor.tasks]) {
        return factor.tasks[stage as keyof typeof factor.tasks].filter((task: string) => task !== '-');
      }
    }
    
    // Fallback to the local JSON data
    const factor = tcofFactorsRaw.find((f: TCOFFactorTask) => f.id === factorId);
    if (factor && factor.tasks && factor.tasks[stage as keyof typeof factor.tasks]) {
      return factor.tasks[stage as keyof typeof factor.tasks].filter((task: string) => task !== '-');
    }
    
    // Last resort, fallback to getting from the TCOFTask format
    const tasks = tcofTasksRaw.filter(
      (task: TCOFTask) => task.id === factorId && task.stage === stage
    );
    
    return tasks.map((task: TCOFTask) => task.text);
  } catch (error) {
    console.error(`Error getting tasks for factor ${factorId} and stage ${stage}:`, error);
    return [];
  }
}

// Export the raw data as well for direct access
export const tcofTasks = tcofTasksRaw;
export const presetHeuristics = presetHeuristicsRaw;
export const deliveryZones = deliveryZonesRaw;
export const tcofFactors = tcofFactorsRaw;