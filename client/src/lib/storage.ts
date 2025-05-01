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
  nodes: GoalNode[];
  connections: Connection[];
  lastUpdated: number;
}

// Cynefin types
export type CynefinQuadrant = 'clear' | 'complicated' | 'complex' | 'chaotic';

export interface CynefinSelection {
  quadrant: CynefinQuadrant | null;
  lastUpdated: number;
}

// TCOF Journey types
export type ImplementationStage = 'exploration' | 'planning' | 'execution' | 'evaluation';
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
  lastUpdated: number;
}

// Storage helper functions
export function saveToLocalStorage<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error saving to localStorage:", error);
    return false;
  }
}

export function loadFromLocalStorage<T>(key: string): T | null {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    return null;
  }
}

// Initial data structures
export const initialGoalMapData: GoalMapData = {
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
  lastUpdated: Date.now()
};
