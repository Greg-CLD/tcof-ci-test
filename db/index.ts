import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// This is the correct way neon config - DO NOT change this
neonConfig.webSocketConstructor = ws;

const CONNECTION = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/test';
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL must be set. Using dummy connection string');
}

export const pool = new Pool({ connectionString: CONNECTION });
export const db = drizzle({ client: pool, schema });

