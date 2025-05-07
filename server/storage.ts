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

// Password utilities
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
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
  async getUser(id: number) {
    try {
      // Use a direct SQL query to avoid the ORM column mapping issue
      const result = await db.execute(
        sql`SELECT id, username, email, password, created_at FROM users WHERE id = ${id}`
      );
      
      if (result && result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          username: row.username,
          email: row.email,
          password: row.password,
          createdAt: row.created_at,
          updatedAt: null, // This column doesn't exist in the database
          firstName: null, // This column doesn't exist in the database
          lastName: null   // This column doesn't exist in the database
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  async getUserByUsername(username: string) {
    try {
      // Use a direct SQL query to avoid the ORM column mapping issue, based on the actual schema
      const result = await db.execute(
        sql`SELECT id, username, email, password, created_at FROM users WHERE username = ${username}`
      );
      
      if (result && result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          username: row.username,
          email: row.email,
          password: row.password,
          createdAt: row.created_at,
          updatedAt: null, // This field doesn't exist in the database
          firstName: null, // This field doesn't exist in the database
          lastName: null   // This field doesn't exist in the database
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  },

  async createUser(userData: { username: string; password: string; email?: string }) {
    try {
      // Hash the password before storing
      const hashedPassword = await hashPassword(userData.password);
      
      // Use direct SQL query to avoid column name mismatches
      const result = await db.execute(
        sql`INSERT INTO users (username, password, email, created_at)
            VALUES (${userData.username}, ${hashedPassword}, ${userData.email || null}, ${new Date()})
            RETURNING id, username, email, created_at`
      );
      
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          username: row.username,
          email: row.email,
          password: hashedPassword,
          createdAt: row.created_at,
          updatedAt: null,
          firstName: null,
          lastName: null
        };
      }
      
      throw new Error('Failed to create user');
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Password verification
  comparePasswords,

  // Goal Map methods
  async getGoalMaps(userId: number) {
    return await db.query.goalMaps.findMany({
      where: eq(goalMaps.userId, userId),
      orderBy: desc(goalMaps.lastUpdated)
    });
  },

  async getGoalMap(id: number) {
    return await db.query.goalMaps.findFirst({
      where: eq(goalMaps.id, id)
    });
  },

  async saveGoalMap(userId: number, name: string, data: any) {
    console.log(`STORAGE: Saving goal map for user ${userId} at ${new Date().toISOString()}`);
    console.log(`STORAGE: Goal map data structure:`, typeof data === 'object' ? 
      `Object with keys: ${Object.keys(data).join(', ')}` : 
      `Type: ${typeof data}`);
    
    if (data && data.goals) {
      console.log(`STORAGE: Number of goals in data: ${data.goals.length}`);
    }
    
    const [goalMap] = await db.insert(goalMaps)
      .values({
        userId,
        name,
        data,
        lastUpdated: new Date()
      })
      .returning();
    
    console.log(`STORAGE: Goal map saved with ID: ${goalMap.id}`);
    return goalMap;
  },
  
  async createGoalMap(userId: number, payload: any) {
    console.log(`STORAGE: Creating goal map for user ${userId} at ${new Date().toISOString()}`);
    
    // Extract data from payload
    const name = payload.name || "Goal Map";
    const data = payload.data || {};
    
    // Log the structure and content
    console.log(`STORAGE: Goal map name: ${name}`);
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
    
    // Create the goal map
    const [goalMap] = await db.insert(goalMaps)
      .values({
        userId,
        name,
        data,
        lastUpdated: new Date()
      })
      .returning();
    
    console.log(`STORAGE: Goal map created with ID: ${goalMap.id}`);
    return goalMap;
  },

  async updateGoalMap(id: number, data: any, name?: string) {
    console.log(`STORAGE: Updating goal map ${id} at ${new Date().toISOString()}`);
    console.log(`STORAGE: Goal map data structure:`, typeof data === 'object' ? 
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
    
    const updateValues: any = {
      data,
      lastUpdated: new Date()
    };

    if (name) {
      updateValues.name = name;
    }

    const [updatedMap] = await db
      .update(goalMaps)
      .set(updateValues)
      .where(eq(goalMaps.id, id))
      .returning();
    
    console.log(`STORAGE: Goal map updated successfully. ID: ${updatedMap.id}`);
    return updatedMap;
  },

  // Cynefin Selection methods
  async getCynefinSelections(userId: number) {
    return await db.query.cynefinSelections.findMany({
      where: eq(cynefinSelections.userId, userId),
      orderBy: desc(cynefinSelections.lastUpdated)
    });
  },

  async getCynefinSelection(id: number) {
    return await db.query.cynefinSelections.findFirst({
      where: eq(cynefinSelections.id, id)
    });
  },

  async saveCynefinSelection(userId: number, name: string, data: any) {
    const [selection] = await db.insert(cynefinSelections)
      .values({
        userId,
        name,
        data,
        lastUpdated: new Date()
      })
      .returning();
    
    return selection;
  },

  async updateCynefinSelection(id: number, data: any, name?: string) {
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
      .where(eq(cynefinSelections.id, id))
      .returning();
    
    return updatedSelection;
  },

  // TCOF Journey methods
  async getTCOFJourneys(userId: number) {
    return await db.query.tcofJourneys.findMany({
      where: eq(tcofJourneys.userId, userId),
      orderBy: desc(tcofJourneys.lastUpdated)
    });
  },

  async getTCOFJourney(id: number) {
    return await db.query.tcofJourneys.findFirst({
      where: eq(tcofJourneys.id, id)
    });
  },

  async saveTCOFJourney(userId: number, name: string, data: any) {
    const [journey] = await db.insert(tcofJourneys)
      .values({
        userId,
        name,
        data,
        lastUpdated: new Date()
      })
      .returning();
    
    return journey;
  },

  async updateTCOFJourney(id: number, data: any, name?: string) {
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
      .where(eq(tcofJourneys.id, id))
      .returning();
    
    return updatedJourney;
  },

  // Project methods
  async getProjects(userId: number) {
    return await db.query.projects.findMany({
      where: eq(projects.userId, userId),
      orderBy: desc(projects.lastUpdated)
    });
  },

  async getProject(id: string) {
    return await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        goalMap: true,
        cynefinSelection: true,
        tcofJourney: true
      }
    });
  },

  async createProject(
    userId: number, 
    name: string, 
    description: string | null, 
    goalMapId: number | null, 
    cynefinSelectionId: number | null, 
    tcofJourneyId: number | null
  ) {
    const [project] = await db.insert(projects)
      .values({
        userId,
        name,
        description,
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
      .where(eq(projects.id, id))
      .returning();
    
    return updatedProject;
  },
  
  // Tool progress tracking methods
  async storeToolProgress(userId: number, projectId: string, toolName: string, progressData: any) {
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
      let progress = {};
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
  
  async getToolProgress(userId: number, projectId: string, toolName: string) {
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
  
  async markCynefinOrientationComplete(userId: number, projectId: string) {
    return this.storeToolProgress(userId, projectId, "cynefinOrientation", {
      completed: true,
      lastUpdated: new Date().toISOString()
    });
  },
  
  async getCynefinOrientationStatus(userId: number, projectId: string) {
    return this.getToolProgress(userId, projectId, "cynefinOrientation");
  },
  
  async markGoalMappingComplete(userId: number, projectId: string) {
    return this.storeToolProgress(userId, projectId, "goalMapping", {
      completed: true,
      lastUpdated: new Date().toISOString()
    });
  },
  
  async markTCOFJourneyComplete(userId: number, projectId: string) {
    return this.storeToolProgress(userId, projectId, "tcofJourney", {
      completed: true,
      lastUpdated: new Date().toISOString()
    });
  }
};
