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

// Function to load TCOF factors from JSON with proper error handling
export async function loadTCOFFactors(): Promise<TCOFFactorTask[]> {
  try {
    // For now, we're only loading from the local JSON file
    // In the future, this could be extended to load from an API endpoint
    return tcofFactorsRaw;
  } catch (error) {
    console.error('Error loading TCOF factors:', error);
    return [];
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
    // Transform the raw tasks into factor options
    return tcofTasksRaw.map((task: TCOFTask) => ({
      value: task.id,
      label: `${task.id}: ${task.text}`
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
    const factor = tcofTasksRaw.find((task: TCOFTask) => task.id === factorId);
    return factor ? `${factor.id}: ${factor.text}` : factorId;
  } catch (error) {
    console.error('Error getting factor name by ID:', error);
    return factorId;
  }
}

// Export the raw data as well for direct access
export const tcofTasks = tcofTasksRaw;
export const presetHeuristics = presetHeuristicsRaw;
export const deliveryZones = deliveryZonesRaw;
export const tcofFactors = tcofFactorsRaw;