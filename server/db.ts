
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';

// Use a safe fallback connection string if DATABASE_URL isn't provided.
const connectionString = process.env.DATABASE_URL ||
  'postgres://user:pass@localhost:5432/test';
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not set; using dummy connection string');
}

// Create a Neon client (arrayMode = true because Drizzle expects row arrays)
export const sql = neon(connectionString, { arrayMode: true });

// Drizzle instance
export const db = drizzle(sql, { schema });
