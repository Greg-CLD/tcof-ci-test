/**
 * Utility functions for working with TCOF Factor Tasks
 * This module provides specific utilities for the Block2Design page
 */
// Import using the TCOFFactorTask interface from tcofData.ts
import { TCOFFactorTask } from './tcofData';

// Create a mock array for fallback
const tcofFactorsRaw: TCOFFactorTask[] = [];

// TypeScript declaration for global window object with cached factors
declare global {
  interface Window {
    _cachedFactors?: TCOFFactorTask[];
  }
}

/**
 * Helper function to convert TCOF factors to Item format for the FactorTaskEditor
 */
export function getTcofFactorsAsItems(): Array<{ id: string; title: string }> {
  try {
    // First check if we have cached factors from the API
    if (window._cachedFactors && window._cachedFactors.length > 0) {
      return window._cachedFactors.map((factor: TCOFFactorTask) => ({
        id: factor.id,
        title: factor.title
      }));
    }
    
    // Fallback to using the local JSON data
    return tcofFactorsRaw.map((factor: TCOFFactorTask) => ({
      id: factor.id,
      title: factor.title
    }));
  } catch (error) {
    console.error('Error generating TCOF factor items:', error);
    // Return empty array as fallback
    return [];
  }
}

/**
 * Initialize TCOF factors by loading them from the API
 */
export async function initializeFactors(): Promise<void> {
  try {
    // Attempt to load from API
    const response = await fetch('/api/admin/success-factors');
    if (response.ok) {
      const factors = await response.json();
      // Cache the factors for use in synchronous functions
      window._cachedFactors = factors;
    } else {
      console.warn('Failed to initialize factors from API, using local JSON data');
      window._cachedFactors = tcofFactorsRaw;
    }
  } catch (error) {
    console.error('Error initializing factors:', error);
    window._cachedFactors = tcofFactorsRaw;
  }
}

/**
 * Get the name of a factor by its ID
 */
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
    
    return factorId;
  } catch (error) {
    console.error('Error getting factor name by ID:', error);
    return factorId;
  }
}

/**
 * Get tasks for a specific factor and stage
 */
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
    
    return [];
  } catch (error) {
    console.error(`Error getting tasks for factor ${factorId} and stage ${stage}:`, error);
    return [];
  }
}