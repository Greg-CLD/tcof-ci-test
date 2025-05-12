/**
 * Server-side storage utilities for data persistence
 * Provides access to database operations for user data storage
 */

import { db } from "../db";
import {
  users,
  projects,
  plans,
  goalMaps,
  cynefinSelections,
  tcofJourneys
} from "../shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import pkg from "pg";
const { Pool } = pkg;
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Create a connection pool for session storage
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PostgresSessionStore = connectPg(session);

// Password utilities - exported directly to be used by authentication system
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export const storage = {
  // Session store for authentication
  sessionStore: new PostgresSessionStore({ 
    pool, 
    createTableIfMissing: true 
  }),

  // User methods
  async getUser(id: string | number) {
    try {
      console.log(`getUser called with id: ${id} (type: ${typeof id})`);
      
      // Convert ID to number for Drizzle
      const userId = Number(id);
      
      // Use Drizzle to query the user
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (user) {
        console.log(`User found: ${user.username}`);
        return user;
      }
      
      console.log(`No user found with id: ${id}`);
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  async getUserByUsername(username: string) {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      
      if (user) {
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  },
  
  async getUserByEmail(email: string) {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (user) {
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  },

  async createUser(userData: { username: string; password?: string; email?: string; id?: string | number; avatarUrl?: string }) {
    try {
      console.log("storage.createUser called with:", JSON.stringify(userData, null, 2));
      
      // Hash the password if provided
      const hashedPassword = userData.password ? await hashPassword(userData.password) : null;
      
      // Convert/generate user ID as number
      const userId = userData.id ? Number(userData.id) : Date.now();
      
      console.log(`Using userId: ${userId} (type: ${typeof userId})`);
      
      // Use Drizzle to insert user with numeric ID
      const [user] = await db.insert(users).values({
        id: userId,
        username: userData.username,
        password: hashedPassword,
        email: userData.email || null,
        avatarUrl: userData.avatarUrl || null
      }).returning();
      
      if (user) {
        console.log("User created successfully:", user.id);
        return user;
      }
      
      throw new Error('Failed to create user: No user returned from insert operation');
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  
  async upsertUser(userData: { id: string | number; username: string; email?: string; avatarUrl?: string }) {
    try {
      console.log("storage.upsertUser called with:", JSON.stringify(userData, null, 2));
      
      // Convert ID to number for database operations
      const userId = Number(userData.id);
      
      console.log(`Using userId for upsert: ${userId} (type: ${typeof userId})`);
      
      // Check if user already exists
      const existingUser = await this.getUser(userId);
      
      if (existingUser) {
        console.log("Updating existing user:", userId);
        
        // Use Drizzle to update user
        const [updatedUser] = await db.update(users)
          .set({
            username: userData.username,
            email: userData.email || existingUser.email,
            avatarUrl: userData.avatarUrl || existingUser.avatarUrl
          })
          .where(eq(users.id, userId))
          .returning();
        
        if (updatedUser) {
          console.log("User updated successfully:", updatedUser.id);
          return updatedUser;
        }
        
        throw new Error('Failed to update user: No user returned from update operation');
      } else {
        console.log("Creating new user:", userId);
        
        // Use Drizzle to insert user with numeric ID
        const [newUser] = await db.insert(users)
          .values({
            id: userId,
            username: userData.username,
            email: userData.email || null,
            avatarUrl: userData.avatarUrl || null
          })
          .returning();
        
        if (newUser) {
          console.log("New user created successfully:", newUser.id);
          return newUser;
        }
        
        throw new Error('Failed to create user: No user returned from insert operation');
      }
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  },

  // Password verification
  comparePasswords,

  // Goal Map methods
  async getGoalMaps(userId: string) {
    return await db.query.goalMaps.findMany({
      where: eq(goalMaps.userId, Number(userId)),
      orderBy: desc(goalMaps.lastUpdated)
    });
  },

  async getGoalMap(id: number | string) {
    return await db.query.goalMaps.findFirst({
      where: eq(goalMaps.id, Number(id))
    });
  },

  async saveGoalMap(userId: string, name: string, data: any) {
    console.log(`STORAGE: Saving goal map for user ${userId} at ${new Date().toISOString()}`);
    console.log(`STORAGE: Goal map data structure:`, typeof data === 'object' ? 
      `Object with keys: ${Object.keys(data).join(', ')}` : 
      `Type: ${typeof data}`);
    
    if (data && data.goals) {
      console.log(`STORAGE: Number of goals in data: ${data.goals.length}`);
    }
    
    const [goalMap] = await db.insert(goalMaps)
      .values({
        userId: Number(userId),
        name,
        data,
        lastUpdated: new Date()
      })
      .returning();
    
    console.log(`STORAGE: Goal map saved with ID: ${goalMap.id}`);
    return goalMap;
  },
  
  async createGoalMap(userId: string, payload: any) {
    console.log(`STORAGE: Creating goal map for user ${userId} at ${new Date().toISOString()}`);
    
    try {
      // Extract data from payload and ensure proper structure
      const name = payload.name || "Goal Map";
      
      // Ensure data is properly structured
      let data: any = {};
      
      // If payload.data is present, use it
      if (payload.data) {
        data = payload.data;
      } 
      // Otherwise try to extract directly from payload
      else if (payload.goals) {
        data = {
          goals: payload.goals,
          projectId: payload.projectId,
          lastUpdated: payload.lastUpdated || Date.now()
        };
      }
      
      // Ensure the data has a projectId (critical for relations)
      if (!data.projectId && payload.projectId) {
        data.projectId = payload.projectId;
      }
      
      // Ensure goals array exists
      if (!data.goals && payload.goals) {
        data.goals = payload.goals;
      } else if (!data.goals) {
        data.goals = [];
      }
      
      // Add timestamp if missing
      if (!data.lastUpdated) {
        data.lastUpdated = Date.now();
      }
      
      // Log the structure and content
      console.log(`STORAGE: Goal map name: ${name}`);
      console.log(`STORAGE: Goal map projectId: ${data.projectId}`);
      console.log(`STORAGE: Data structure:`, typeof data === 'object' ? 
        `Object with keys: ${Object.keys(data).join(', ')}` : 
        `Type: ${typeof data}`);
      
      if (data && data.goals) {
        console.log(`STORAGE: Number of goals in data: ${data.goals.length}`);
        console.log(`STORAGE: Goals:`, JSON.stringify(data.goals.map((g: any) => ({ 
          id: g.id, 
          level: g.level, 
          text: g.text?.substring(0, 20) + (g.text?.length > 20 ? '...' : '') 
        })), null, 2));
      }
      
      // Create the goal map in the database
      const [goalMap] = await db.insert(goalMaps)
        .values({
          userId: Number(userId),
          name,
          data,
          lastUpdated: new Date()
        })
        .returning();
      
      console.log(`STORAGE: Goal map created with ID: ${goalMap.id}`);
      
      // Return the complete goal map data
      return {
        ...goalMap,
        // Also include a flattened goals array for easier access
        goals: data.goals || []
      };
    } catch (error: any) {
      console.error('Error creating goal map:', error);
      throw new Error(`Failed to create goal map: ${error.message}`);
    }
  },

  async updateGoalMap(id: number, data: any, name?: string) {
    console.log(`STORAGE: Updating goal map ${id} at ${new Date().toISOString()}`);
    
    try {
      // Ensure data is properly structured
      if (!data) {
        console.error('STORAGE: Cannot update goal map with undefined data');
        throw new Error('Goal map data is required for update');
      }
      
      console.log(`STORAGE: Goal map data structure:`, typeof data === 'object' ? 
        `Object with keys: ${Object.keys(data).join(', ')}` : 
        `Type: ${typeof data}`);
      
      // Normalize data structure if needed
      if (data.goals) {
        // Direct goals array provided - ensure it's valid
        console.log(`STORAGE: Number of goals in data: ${data.goals.length}`);
        console.log(`STORAGE: Goals:`, JSON.stringify(data.goals.map((g: any) => ({ 
          id: g.id, 
          level: g.level, 
          text: g.text?.substring(0, 20) + (g.text?.length > 20 ? '...' : '') 
        })), null, 2));
        
        // If goals is directly on data but not in data.data, we need to restructure
        if (!data.data || !data.data.goals) {
          data = {
            ...data,
            data: {
              ...(data.data || {}),
              goals: data.goals,
              projectId: data.projectId,
              lastUpdated: data.lastUpdated || Date.now()
            }
          };
          console.log('STORAGE: Restructured data to ensure goals in data.data');
        }
      }
      
      // Prepare update values
      const updateValues: any = {
        lastUpdated: new Date()
      };
      
      // Update data or merge with existing
      if (data.data) {
        updateValues.data = data.data;
      } else {
        updateValues.data = data;
      }
      
      // Update name if provided
      if (name) {
        updateValues.name = name;
      } else if (data.name) {
        updateValues.name = data.name;
      }
      
      // Update the map in the database
      const [updatedMap] = await db
        .update(goalMaps)
        .set(updateValues)
        .where(eq(goalMaps.id, id))
        .returning();
      
      console.log(`STORAGE: Goal map updated successfully. ID: ${updatedMap.id}`);
      
      // Return formatted response with data in expected format
      return {
        ...updatedMap,
        // Always include flattened goals for easier access
        goals: updatedMap.data && typeof updatedMap.data === 'object' && updatedMap.data !== null && 'goals' in updatedMap.data 
          ? updatedMap.data.goals 
          : [],
      };
    } catch (error: any) {
      console.error('STORAGE: Error updating goal map:', error);
      throw new Error(`Failed to update goal map: ${error.message}`);
    }
  },

  // Cynefin Selection methods
  async getCynefinSelections(userId: string) {
    return await db.query.cynefinSelections.findMany({
      where: eq(cynefinSelections.userId, Number(userId)),
      orderBy: desc(cynefinSelections.lastUpdated)
    });
  },

  async getCynefinSelection(id: number | string) {
    return await db.query.cynefinSelections.findFirst({
      where: eq(cynefinSelections.id, Number(id))
    });
  },

  async saveCynefinSelection(userId: string, name: string, data: any) {
    const [selection] = await db.insert(cynefinSelections)
      .values({
        userId: Number(userId),
        name,
        data,
        lastUpdated: new Date()
      })
      .returning();
    
    return selection;
  },

  async updateCynefinSelection(id: number | string, data: any, name?: string) {
    const updateValues: any = {
      data,
      lastUpdated: new Date()
    };

    if (name) {
      updateValues.name = name;
    }

    const [updatedSelection] = await db
      .update(cynefinSelections)
      .set(updateValues)
      .where(eq(cynefinSelections.id, Number(id)))
      .returning();
    
    return updatedSelection;
  },

  // TCOF Journey methods
  async getTCOFJourneys(userId: string) {
    return await db.query.tcofJourneys.findMany({
      where: eq(tcofJourneys.userId, Number(userId)),
      orderBy: desc(tcofJourneys.lastUpdated)
    });
  },

  async getTCOFJourney(id: number | string) {
    return await db.query.tcofJourneys.findFirst({
      where: eq(tcofJourneys.id, Number(id))
    });
  },

  async saveTCOFJourney(userId: string, name: string, data: any) {
    const [journey] = await db.insert(tcofJourneys)
      .values({
        userId: Number(userId),
        name,
        data,
        lastUpdated: new Date()
      })
      .returning();
    
    return journey;
  },

  async updateTCOFJourney(id: number | string, data: any, name?: string) {
    const updateValues: any = {
      data,
      lastUpdated: new Date()
    };

    if (name) {
      updateValues.name = name;
    }

    const [updatedJourney] = await db
      .update(tcofJourneys)
      .set(updateValues)
      .where(eq(tcofJourneys.id, Number(id)))
      .returning();
    
    return updatedJourney;
  },

  // Project methods
  async getProjects(userId: string) {
    return await db.query.projects.findMany({
      where: eq(projects.userId, Number(userId)),
      orderBy: desc(projects.lastUpdated)
    });
  },

  async getProject(id: string | number) {
    return await db.query.projects.findFirst({
      where: eq(projects.id, Number(id)),
      with: {
        goalMap: true,
        cynefinSelection: true,
        tcofJourney: true
      }
    });
  },

  async createProject(
    userId: string, 
    name: string, 
    description: string | null, 
    goalMapId: number | null, 
    cynefinSelectionId: number | null, 
    tcofJourneyId: number | null
  ) {
    // Use the project schema fields directly
    const [project] = await db.insert(projects)
      .values({
        name,
        description,
        userId: Number(userId),
        goalMapId,
        cynefinSelectionId,
        tcofJourneyId,
        lastUpdated: new Date()
      })
      .returning();
    
    return project;
  },

  async updateProject(
    id: string,
    data: {
      name?: string,
      description?: string | null,
      sector?: string,
      customSector?: string | null,
      orgType?: string,
      teamSize?: string,
      currentStage?: string,
      goalMapId?: number | null,
      cynefinSelectionId?: number | null,
      tcofJourneyId?: number | null,
      isProfileComplete?: boolean
    }
  ) {
    console.log("Updating project with data:", JSON.stringify(data, null, 2));
    const updateValues = {
      ...data,
      lastUpdated: new Date()
    };

    const [updatedProject] = await db
      .update(projects)
      .set(updateValues)
      .where(eq(projects.id, Number(id)))
      .returning();
    
    return updatedProject;
  },
  
  // Tool progress tracking methods
  async storeToolProgress(userId: string, projectId: string, toolName: string, progressData: any) {
    try {
      // Store in a local file for now - in production this would go in a database table
      const fs = require('fs');
      const path = require('path');
      
      // Make sure the data directory exists
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Create the progress tracking file path
      const progressFile = path.join(dataDir, 'tool-progress.json');
      
      // Read existing progress data if available
      let progress: Record<string, Record<string, Record<string, any>>> = {};
      if (fs.existsSync(progressFile)) {
        try {
          const data = fs.readFileSync(progressFile, 'utf8');
          progress = JSON.parse(data);
        } catch (err) {
          console.error('Error reading tool progress file:', err);
        }
      }
      
      // Initialize user and project objects if they don't exist
      progress[userId] = progress[userId] || {};
      progress[userId][projectId] = progress[userId][projectId] || {};
      
      // Update the tool progress with new data
      progress[userId][projectId][toolName] = {
        ...progressData,
        lastUpdated: new Date().toISOString()
      };
      
      // Save the updated progress data
      fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
      
      console.log(`Stored progress for user ${userId}, project ${projectId}, tool ${toolName}`);
      return true;
    } catch (error) {
      console.error('Error storing tool progress:', error);
      return false;
    }
  },
  
  async getToolProgress(userId: string, projectId: string, toolName: string) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Get the progress tracking file path
      const progressFile = path.join(process.cwd(), 'data', 'tool-progress.json');
      
      // Check if the file exists
      if (!fs.existsSync(progressFile)) {
        console.log('No tool progress file found');
        return null;
      }
      
      // Read and parse the progress data
      const data = fs.readFileSync(progressFile, 'utf8');
      const progress = JSON.parse(data);
      
      // Check if progress exists for this user, project, and tool
      if (
        progress[userId] && 
        progress[userId][projectId] && 
        progress[userId][projectId][toolName]
      ) {
        console.log(`Found progress for user ${userId}, project ${projectId}, tool ${toolName}`);
        return progress[userId][projectId][toolName];
      }
      
      console.log(`No progress found for user ${userId}, project ${projectId}, tool ${toolName}`);
      return null;
    } catch (error) {
      console.error('Error getting tool progress:', error);
      return null;
    }
  },
  
  async markCynefinOrientationComplete(userId: string, projectId: string) {
    return this.storeToolProgress(userId, projectId, "cynefinOrientation", {
      completed: true,
      lastUpdated: new Date().toISOString()
    });
  },
  
  async getCynefinOrientationStatus(userId: string, projectId: string) {
    return this.getToolProgress(userId, projectId, "cynefinOrientation");
  },
  
  async markGoalMappingComplete(userId: string, projectId: string) {
    // ONLY write {completed: true} to tool-progress
    // No goal map modifications or relations are touched
    return this.storeToolProgress(userId, projectId, "goalMapping", {
      completed: true,
      lastUpdated: new Date().toISOString()
    });
  },
  
  async getGoalMappingStatus(userId: string, projectId: string) {
    // Get the tool progress which should contain just {completed: true}
    return this.getToolProgress(userId, projectId, "goalMapping");
  },
  
  async markTCOFJourneyComplete(userId: string, projectId: string) {
    return this.storeToolProgress(userId, projectId, "tcofJourney", {
      completed: true,
      lastUpdated: new Date().toISOString()
    });
  }
};
