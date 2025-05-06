import { sql } from 'drizzle-orm';

export async function up(db) {
  // Add the is_profile_complete column to the projects table
  // Default to false for existing projects
  await db.execute(sql`
    ALTER TABLE projects 
    ADD COLUMN is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}

export async function down(db) {
  // Remove the column if migration needs to be reversed
  await db.execute(sql`
    ALTER TABLE projects 
    DROP COLUMN IF EXISTS is_profile_complete;
  `);
}