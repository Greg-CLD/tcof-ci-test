import { z } from 'zod';
import { PersonalHeuristic } from './personal-heuristics';

/**
 * Type for the block1 data structure in a plan
 */
export interface Block1Data {
  successFactorRatings?: Record<string, string>;
  personalHeuristics?: PersonalHeuristic[];
  successCriteria?: string;
  lastUpdated?: string;
  completed?: boolean;
}

/**
 * Type for the entire plan blocks data structure
 */
export interface PlanBlocksData {
  block1?: Block1Data;
  block2?: {
    tasks?: any[];
    stakeholders?: any[];
    completed?: boolean;
    lastUpdated?: string;
  };
  block3?: {
    timeline?: any;
    deliveryApproach?: string;
    deliveryNotes?: string;
    completed?: boolean;
    lastUpdated?: string;
  };
}

/**
 * Type for the entire plan data structure
 */
export interface PlanData {
  id?: string;
  projectId: number;
  userId?: number;
  name?: string;
  blocks: PlanBlocksData;
  createdAt?: string;
  updatedAt?: string;
}