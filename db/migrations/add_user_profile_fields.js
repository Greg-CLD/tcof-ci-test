/**
 * Migration to add profile fields to users table
 */
import { db } from '../index.js';
import { sql } from 'drizzle-orm';

async function migrateUsers() {
  console.log('Starting user profile fields migration...');
  
  try {
    // Check if avatar_url column exists
    const checkColumnQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar_url'
    `;
    
    const columnExists = await db.execute(checkColumnQuery);
    
    if (columnExists.length === 0) {
      console.log('Adding new columns to users table...');
      
      // Add avatar_url column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255)
      `);
      
      // Add notification_prefs column
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}'
      `);
      
      // Add locale column
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS locale VARCHAR(50) DEFAULT 'en-US'
      `);
      
      // Add timezone column
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC'
      `);
      
      // Add updated_at column if it doesn't exist already
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()
      `);
      
      console.log('User profile fields migration completed successfully');
    } else {
      console.log('User profile fields already exist, skipping migration');
    }
  } catch (error) {
    console.error('Error during user profile fields migration:', error);
    throw error;
  }
}

// Run the migration
migrateUsers()
  .then(() => {
    console.log('User profile migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('User profile migration failed:', error);
    process.exit(1);
  });