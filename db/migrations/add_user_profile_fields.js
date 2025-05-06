/**
 * Script to run the user profile fields migration
 */
import { db } from '../index.js';
import { users } from '@shared/schema.ts';
import { sql } from 'drizzle-orm';

async function addUserProfileFields() {
  console.log('Running migration: add user profile fields');
  
  try {
    // Check if avatarUrl column exists
    const checkColumnQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar_url';
    `;
    const existingColumns = await db.execute(checkColumnQuery);
    
    if (existingColumns.rows.length === 0) {
      // Add new columns with default values if they don't exist
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255),
        ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS locale VARCHAR(50) DEFAULT 'en-US',
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
      `);
      
      console.log('Added user profile fields to the users table');
    } else {
      console.log('User profile fields already exist in the users table');
    }
    
    return { success: true, message: 'User profile fields migration completed successfully' };
  } catch (error) {
    console.error('Error running user profile fields migration:', error);
    return { success: false, message: `Migration failed: ${error.message}` };
  }
}

// Run the migration
const result = await addUserProfileFields();
console.log(result.message);

// Exit with success/failure code
process.exit(result.success ? 0 : 1);