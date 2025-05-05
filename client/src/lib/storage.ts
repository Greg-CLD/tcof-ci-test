// Local storage keys
export const STORAGE_KEYS = {
  GOAL_MAP: 'goal-map-data',
  CYNEFIN_SELECTION: 'cynefin-selection',
  TCOF_JOURNEY: 'tcof-journey-data'
};

// Goal Map types
export interface GoalNode {
  id: string;
  text: string;
  timeframe: string;
  x: number;
  y: number;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface GoalMapData {
  name: string;
  nodes: GoalNode[];
  connections: Connection[];
  lastUpdated: number;
  id?: string;
  projectId?: string;
}

// Cynefin types
export type CynefinQuadrant = 'clear' | 'complicated' | 'complex' | 'chaotic';

export interface CynefinSelection {
  quadrant: CynefinQuadrant | null;
  lastUpdated: number;
}

// TCOF Journey types
export type ImplementationStage = 'identification' | 'definition' | 'delivery' | 'closure';
export type ResourceLevel = 'minimal' | 'adequate' | 'abundant';
export type Priority = 'efficiency' | 'innovation' | 'experience' | 'cost';
export type Timeframe = 'immediate' | 'short' | 'medium' | 'long';
export type EvaluationFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annually';

export interface TCOFJourneyData {
  stage: ImplementationStage | null;
  capabilities: {
    technicalExpertise: number;
    resources: ResourceLevel | null;
  };
  priority: Priority | null;
  implementation: {
    timeframe: Timeframe | null;
    constraints: string[];
  };
  metrics: {
    primary: string[];
    evaluationFrequency: EvaluationFrequency | null;
  };
  notes: Record<string, string>;
  lastUpdated: number;
}

// Import our browser-compatible storage adapter
import { storage as db } from './browserStorage';

// Storage helper functions
export async function saveToLocalStorage<T>(key: string, data: T): Promise<boolean> {
  try {
    // Save to our storage adapter (which may be Replit DB or localStorage)
    await db.set(key, JSON.stringify(data));
    
    // Always save a backup copy to localStorage directly
    // This provides a fallback if the adapter fails
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error saving to storage:", error);
    
    // Fallback to localStorage directly
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (localError) {
      console.error("Error saving to localStorage:", localError);
      return false;
    }
  }
}

export async function loadFromLocalStorage<T>(key: string): Promise<T | null> {
  try {
    // First try to get from our storage adapter
    const storedData = await db.get(key);
    
    if (storedData) {
      return typeof storedData === 'string' ? JSON.parse(storedData) : storedData;
    }
    
    // If not found in adapter, check localStorage directly
    const localData = localStorage.getItem(key);
    
    if (localData) {
      // Found in localStorage, migrate to our storage adapter for next time
      await db.set(key, localData);
      return JSON.parse(localData);
    }
    
    return null;
  } catch (error) {
    console.error("Error loading from storage:", error);
    
    // Fallback to localStorage directly
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (localError) {
      console.error("Error loading from localStorage:", localError);
      return null;
    }
  }
}

// Initial data structures
export const initialGoalMapData: GoalMapData = {
  name: "My Success Map",
  nodes: [],
  connections: [],
  lastUpdated: Date.now()
};

export const initialCynefinSelection: CynefinSelection = {
  quadrant: null,
  lastUpdated: Date.now()
};

export const initialTCOFJourneyData: TCOFJourneyData = {
  stage: null,
  capabilities: {
    technicalExpertise: 3,
    resources: null
  },
  priority: null,
  implementation: {
    timeframe: null,
    constraints: []
  },
  metrics: {
    primary: [],
    evaluationFrequency: null
  },
  notes: {},
  lastUpdated: Date.now()
};
