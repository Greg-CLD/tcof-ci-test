
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@shared/schema';

// Create a Neon client (arrayMode = true because Drizzle expects row arrays)
export const sql = neon(process.env.DATABASE_URL!, { arrayMode: true });

// Drizzle instance
export const db = drizzle(sql, { schema });
