
import { sql } from 'drizzle-orm';

export async function up() {
  return sql`
    CREATE TABLE IF NOT EXISTS success_factor_ratings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      factor_id VARCHAR(255) NOT NULL,
      resonance INTEGER NOT NULL CHECK (resonance >= 1 AND resonance <= 5),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, factor_id)
    );

    CREATE INDEX idx_success_factor_ratings_project ON success_factor_ratings(project_id);
  `;
}

export async function down() {
  return sql`DROP TABLE IF EXISTS success_factor_ratings;`;
}
