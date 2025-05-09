/**
 * Script to convert user IDs from integer to text in the database
 * This is a critical migration needed to fix authentication issues
 */

import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Create raw SQL client
const sql = postgres(DATABASE_URL);

async function migrateUsers() {
  console.log('Starting user ID migration (integer → text)...');
  try {
    // Start a transaction
    await sql.begin(async (tx) => {
      console.log('Creating temporary backup table...');
      
      // 1. Create a backup table with the new schema (id as text)
      await tx`
        CREATE TABLE users_backup (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          email TEXT,
          password TEXT,
          avatar_url VARCHAR,
          notification_prefs JSONB DEFAULT '{}',
          locale VARCHAR DEFAULT 'en-US',
          timezone VARCHAR DEFAULT 'UTC',
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `;
      
      console.log('Copying data to backup table with ID converted to text...');
      
      // 2. Copy data, converting id to text
      await tx`
        INSERT INTO users_backup (id, username, email, password, avatar_url, notification_prefs, locale, timezone, created_at)
        SELECT id::text, username, email, password, avatar_url, notification_prefs, locale, timezone, created_at
        FROM users
      `;
      
      // 3. Verify the data was copied correctly
      const count = await tx`SELECT COUNT(*) FROM users_backup`;
      console.log(`Copied ${count[0].count} users to backup table`);
      
      // 4. Rename tables to swap them
      console.log('Swapping tables...');
      
      await tx`DROP TABLE users`;
      await tx`ALTER TABLE users_backup RENAME TO users`;
      
      console.log('Updating foreign keys in related tables...');
      
      // 5. Update references in related tables - handle each table with text foreign keys
      // Update goal_maps
      await tx`
        ALTER TABLE goal_maps
        ALTER COLUMN user_id TYPE TEXT
      `;
      
      // Update cynefin_selections
      await tx`
        ALTER TABLE cynefin_selections
        ALTER COLUMN user_id TYPE TEXT
      `;
      
      // Update tcof_journeys
      await tx`
        ALTER TABLE tcof_journeys
        ALTER COLUMN user_id TYPE TEXT
      `;
      
      // Update organisation_memberships
      await tx`
        ALTER TABLE organisation_memberships
        ALTER COLUMN user_id TYPE TEXT
      `;
      
      // Update projects
      await tx`
        ALTER TABLE projects
        ALTER COLUMN user_id TYPE TEXT
      `;
      
      // Update outcomes (if needed)
      await tx`
        ALTER TABLE outcomes
        ALTER COLUMN created_by_user_id TYPE TEXT
      `;
      
      // Update plans
      await tx`
        ALTER TABLE plans
        ALTER COLUMN user_id TYPE TEXT
      `;
      
      console.log('Creating admin user if it doesn\'t exist with proper text ID...');
      
      // 6. Create or update admin user with proper text ID
      await tx`
        INSERT INTO users (id, username, password, email, created_at)
        VALUES (
          'admin', 
          'admin', 
          '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4.1a39d2f5bbcb25bde1e62a69b', 
          'admin@example.com', 
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          username = 'admin',
          password = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4.1a39d2f5bbcb25bde1e62a69b'
        RETURNING *
      `;
    });
    
    console.log('Migration completed successfully! The users table now has text IDs.');
    
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the migration
migrateUsers()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });