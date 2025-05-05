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
        sql`SELECT id, username, email, password, created_at, updated_at FROM users WHERE id = ${id}`
      );
      
      if (result && result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          username: row.username,
          email: row.email,
          password: row.password,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          firstName: null,
          lastName: null
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
    const [goalMap] = await db.insert(goalMaps)
      .values({
        userId,
        name,
        data,
        lastUpdated: new Date()
      })
      .returning();
    
    return goalMap;
  },

  async updateGoalMap(id: number, data: any, name?: string) {
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
      goalMapId?: number | null,
      cynefinSelectionId?: number | null,
      tcofJourneyId?: number | null
    }
  ) {
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
  }
};
