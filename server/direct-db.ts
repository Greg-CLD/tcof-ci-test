/**
 * Direct database access using postgres package
 * This bypasses the Drizzle ORM for emergency operations
 */

import postgres from 'postgres';

// Connection details from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create a separate connection with longer timeout
export const db = postgres(DATABASE_URL, {
  idle_timeout: 60,
  connect_timeout: 30,
  statement_timeout: 60000, // 60 seconds
  // Disable transformations to get raw data
  transform: {
    undefined: null,
  }
});

// Helper function for direct SQL queries
export async function query(sql: string, params: any[] = []) {
  try {
    return await db.unsafe(sql, params);
  } catch (error) {
    console.error("Direct DB query error:", error);
    throw error;
  }
}

// Emergency cleanup on process exit
process.on('beforeExit', async () => {
  try {
    await db.end();
    console.log('Direct DB connection closed');
  } catch (err) {
    console.error('Error closing direct DB connection:', err);
  }
});