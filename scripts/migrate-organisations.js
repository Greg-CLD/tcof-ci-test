import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function migrateOrganisations() {
  console.log('Starting organisation migration...');
  
  try {
    // Create organisations table
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

    // Create organisation_memberships table
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

    // Create index on user_id and organisation_id
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_org_idx ON organisation_memberships (user_id, organisation_id);
    `);
    console.log('Created user_org_idx index');

    // Create organisation_heuristics table
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

    // Add organisation_id to projects table
    await db.execute(sql`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL;
    `);
    console.log('Added organisation_id to projects table');

    console.log('Organisation migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateOrganisations()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });