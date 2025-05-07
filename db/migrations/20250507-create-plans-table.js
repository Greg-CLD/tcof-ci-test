/**
 * Creates the plans table for storing Make A Plan data
 */
import { sql } from 'drizzle-orm';

export async function up(db) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      name VARCHAR(255),
      blocks JSONB NOT NULL DEFAULT '{"block1":{"successFactors":[],"personalHeuristics":[],"completed":false},"block2":{"tasks":[],"stakeholders":[],"completed":false},"block3":{"timeline":null,"deliveryApproach":"","deliveryNotes":"","completed":false}}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

export async function down(db) {
  await db.execute(sql`DROP TABLE IF EXISTS plans;`);
}