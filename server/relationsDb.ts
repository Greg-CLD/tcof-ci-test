/**
 * Relations database module
 * Provides background relationship tracking between entities
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Path to relations data file
const DATA_DIR = path.join(process.cwd(), 'data');
const RELATIONS_FILE = path.join(DATA_DIR, 'relations.json');

// Relation types
export type RelationType = 'MAPS_TO' | 'HAS_TASK' | 'USES_FRAMEWORK' | 'BELONGS_TO_PROJECT';

// Relation data type
export interface Relation {
  id: string;
  fromId: string;
  toId: string;
  relType: RelationType;
  projectId: string;
  meta?: {
    stage?: string;
    origin?: string;
  };
  timestamp: string;
}

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize relations data file if it doesn't exist
if (!fs.existsSync(RELATIONS_FILE)) {
  fs.writeFileSync(RELATIONS_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('Created empty relations.json file');
}

/**
 * Load all relations from the data file
 * 
 * @returns Array of all relations
 */
export function loadRelations(): Relation[] {
  try {
    const data = fs.readFileSync(RELATIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading relations:', error);
    return [];
  }
}

/**
 * Save relations to the data file
 */
function saveRelations(relations: Relation[]): boolean {
  try {
    fs.writeFileSync(RELATIONS_FILE, JSON.stringify(relations, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving relations:', error);
    return false;
  }
}

/**
 * Creates a new relation between two entities
 * @param fromId The source entity ID
 * @param toId The target entity ID
 * @param relType The type of relationship
 * @param projectId The project context for this relationship
 * @param meta Optional metadata about the relationship
 * @returns The created relation record or null if creation failed
 */
export async function createRelation(
  fromId: string,
  toId: string,
  relType: RelationType,
  projectId: string,
  meta?: { stage?: string; origin?: string }
): Promise<Relation | null> {
  try {
    // Validate inputs
    if (!fromId || !toId || !relType || !projectId) {
      console.error('Missing required parameters for relation creation:', { fromId, toId, relType, projectId });
      return null;
    }

    // Create new relation object
    const relation: Relation = {
      id: uuidv4(),
      fromId,
      toId,
      relType,
      projectId,
      meta,
      timestamp: new Date().toISOString()
    };

    // Load existing relations
    const relations = loadRelations();

    // Check for duplicate relation
    const existingRelation = relations.find(r => 
      r.fromId === fromId && 
      r.toId === toId && 
      r.relType === relType && 
      r.projectId === projectId
    );

    if (existingRelation) {
      // Just update timestamp and meta if it exists
      existingRelation.timestamp = relation.timestamp;
      if (meta) {
        existingRelation.meta = { ...existingRelation.meta, ...meta };
      }
      saveRelations(relations);
      console.log(`Updated existing relation → ${existingRelation.id}`);
      return existingRelation;
    }

    // Add new relation
    relations.push(relation);

    // Save updated relations list
    const saved = saveRelations(relations);
    
    if (saved) {
      console.log(`Relation saved → ${relation.id} (${relation.relType}: ${relation.fromId} → ${relation.toId})`);
      return relation;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating relation:', error);
    return null;
  }
}

/**
 * Relations database operations
 */
export const relationsDb = {
  /**
   * Get all relations for a project
   * @param projectId Project ID
   * @returns Array of relations for the project
   */
  getProjectRelations: async (projectId: string): Promise<Relation[]> => {
    try {
      // Load all relations
      const relations = loadRelations();
      
      // Filter relations by project ID
      const projectRelations = relations.filter(r => r.projectId === projectId);
      
      return projectRelations;
    } catch (error) {
      console.error('Error getting project relations:', error);
      return [];
    }
  },

  /**
   * Get relations by source entity ID
   * @param fromId Source entity ID
   * @param projectId Optional project ID filter
   * @returns Array of relations from the source entity
   */
  getRelationsFrom: async (fromId: string, projectId?: string): Promise<Relation[]> => {
    try {
      // Load all relations
      const relations = loadRelations();
      
      // Filter relations by source ID and optionally by project
      let filtered = relations.filter(r => r.fromId === fromId);
      if (projectId) {
        filtered = filtered.filter(r => r.projectId === projectId);
      }
      
      return filtered;
    } catch (error) {
      console.error('Error getting relations from entity:', error);
      return [];
    }
  },

  /**
   * Get relations by target entity ID
   * @param toId Target entity ID
   * @param projectId Optional project ID filter
   * @returns Array of relations to the target entity
   */
  getRelationsTo: async (toId: string, projectId?: string): Promise<Relation[]> => {
    try {
      // Load all relations
      const relations = loadRelations();
      
      // Filter relations by target ID and optionally by project
      let filtered = relations.filter(r => r.toId === toId);
      if (projectId) {
        filtered = filtered.filter(r => r.projectId === projectId);
      }
      
      return filtered;
    } catch (error) {
      console.error('Error getting relations to entity:', error);
      return [];
    }
  },
  
  /**
   * Create a new relation between entities
   * @param fromId Source entity ID
   * @param toId Target entity ID
   * @param relType Relation type
   * @param projectId Project ID
   * @param meta Optional metadata
   * @returns Created relation or null if error
   */
  createRelation: async (
    fromId: string,
    toId: string,
    relType: RelationType,
    projectId: string,
    meta?: { stage?: string; origin?: string }
  ): Promise<Relation | null> => {
    // Use the existing createRelation function that's already defined above
    return createRelation(fromId, toId, relType, projectId, meta);
  },

  /**
   * Delete relations for a specific project
   * This should be called when a project is deleted
   * @param projectId Project ID
   * @returns Success status
   */
  deleteProjectRelations: async (projectId: string): Promise<boolean> => {
    try {
      // Load all relations
      const relations = loadRelations();
      
      // Filter out the relations for the project
      const updatedRelations = relations.filter(r => r.projectId !== projectId);
      
      if (updatedRelations.length === relations.length) {
        // No relations were removed
        return true;
      }
      
      // Save updated relations list
      const saved = saveRelations(updatedRelations);
      if (saved) {
        console.log(`Deleted all relations for project ${projectId}`);
      }
      return saved;
    } catch (error) {
      console.error('Error deleting project relations:', error);
      return false;
    }
  }
};