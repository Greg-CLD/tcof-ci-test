const { sql } = require('drizzle-orm');

/**
 * Add description column to success_factors table
 * This migration adds a text column for storing factor descriptions
 */
async function up() {
  return sql`
    ALTER TABLE success_factors 
    ADD COLUMN description TEXT NOT NULL DEFAULT '';
  `;
}

async function down() {
  return sql`
    ALTER TABLE success_factors 
    DROP COLUMN description;
  `;
}

module.exports = { up, down };