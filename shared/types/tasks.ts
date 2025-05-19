/**
 * Task type definitions used by both client and server
 */

/**
 * Unified Task interface for consistent task representation across the application
 * 
 * @property origin - Original source classification of the task (e.g., 'custom', 'factor', 'heuristic')
 * @property source - Normalized duplicate of origin; always present for consistent filtering
 */
export interface UnifiedTask {
  id: string;
  text: string;
  stage: string;
  /** Original source classification of the task */
  origin: 'custom' | 'factor' | 'heuristic' | 'policy' | 'framework' | string;
  /** Normalized duplicate of origin; always present for consistent filtering */
  source: 'custom' | 'factor' | 'heuristic' | 'policy' | 'framework' | string;
  sourceId?: string;      // links task back to factor/heuristic definition
  completed: boolean;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  owner?: string;
  status?: 'To Do' | 'Working On It' | 'Done';
  createdAt?: string;
  updatedAt?: string;
}