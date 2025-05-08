import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Initialize neon with your connection string
const sql = neon(process.env.DATABASE_URL!) as unknown as NeonQueryFunction;

// Create drizzle instance 
export const db = drizzle(sql, { schema });