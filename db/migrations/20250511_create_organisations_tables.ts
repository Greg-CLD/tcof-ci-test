import { sql } from 'drizzle-orm';
import { db } from '../index';

export async function createOrganisationTables() {
  console.log('Running migration: create organisations tables');
  try {
    await db.execute(sql`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS organisations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS organisation_memberships (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS user_org_idx ON organisation_memberships(user_id, organisation_id);

      CREATE TABLE IF NOT EXISTS organisation_heuristics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        success_factor VARCHAR(255) NOT NULL,
        goal TEXT,
        metric TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);
    console.log('Migration successful: organisations tables created');
    return true;
  } catch (error) {
    console.error('Error creating organisations tables:', error);
    return false;
  }
}

export async function up() {
  const success = await createOrganisationTables();
  if (!success) {
    throw new Error('Failed to run organisations tables migration');
  }
}

export async function down() {
  await db.execute(sql`DROP TABLE IF EXISTS organisation_heuristics;`);
  await db.execute(sql`DROP TABLE IF EXISTS organisation_memberships;`);
  await db.execute(sql`DROP TABLE IF EXISTS organisations;`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createOrganisationTables()
    .then(success => {
      console.log(success
        ? 'Migration completed successfully.'
        : 'Migration failed, check logs for details.');
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Migration failed with error:', err);
      process.exit(1);
    });
}
