import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';

// This is the correct way neon config - DO NOT change this
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Execute migration queries for organization tables
async function runMigrations() {
  console.log('Starting organization schema migration...');
  
  try {
    // Create organizations table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organisations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('Created organisations table');

    // Create organization_memberships table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organisation_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('Created organisation_memberships table');

    // Create index on user_id and organisation_id for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_org_idx ON organisation_memberships (user_id, organisation_id);
    `);
    console.log('Created index on organisation_memberships');

    // Create organization_heuristics table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organisation_heuristics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        success_factor VARCHAR(255) NOT NULL,
        goal TEXT,
        metric TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('Created organisation_heuristics table');

    // Add organisation_id to projects table if the column doesn't exist
    try {
      await db.execute(sql`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL;
      `);
      console.log('Added organisation_id to projects table');
    } catch (columnError) {
      console.error('Error adding organisation_id column:', columnError);
      // Continue with other migrations even if this fails
    }

    console.log('Organization schema migration completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations()
  .then(() => {
    console.log('All migrations completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });