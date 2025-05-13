/**
 * Script to seed success factors from JSON into the database
 * This reads from data/successFactors.json and inserts the data into the PostgreSQL tables
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function seedSuccessFactors() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the JSON file
    const jsonPath = path.join(__dirname, '..', 'data', 'successFactors.json');
    const successFactorsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log(`Read ${successFactorsData.length} success factors from JSON file`);

    // Insert factors and tasks inside a transaction
    await client.query('BEGIN');

    // First check how many factors are already in the database
    const { rows: existingFactors } = await client.query('SELECT id FROM success_factors');
    
    if (existingFactors.length > 0) {
      console.log(`Found ${existingFactors.length} existing factors in the database`);
      
      // Only proceed if the user confirms they want to update the data
      const skipConfirmation = process.env.SKIP_CONFIRMATION === 'true';
      
      if (!skipConfirmation) {
        console.log('Success factors already exist in the database. This operation will not create duplicates.');
        console.log('Set environment variable SKIP_CONFIRMATION=true to bypass this message.');
        
        // Option to exit here, or continue to update existing records
        console.log('Existing records will be updated with any new data.');
      }
    }

    // Process each success factor
    for (const factor of successFactorsData) {
      // Check if factor already exists
      const { rows } = await client.query('SELECT id FROM success_factors WHERE id = $1', [factor.id]);
      
      if (rows.length === 0) {
        // Insert the factor
        await client.query(
          'INSERT INTO success_factors (id, title, description) VALUES ($1, $2, $3)',
          [factor.id, factor.title, factor.description || '']
        );
        console.log(`Inserted factor: ${factor.id} - ${factor.title}`);
      } else {
        // Update the existing factor
        await client.query(
          'UPDATE success_factors SET title = $2, description = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [factor.id, factor.title, factor.description || '']
        );
        console.log(`Updated factor: ${factor.id} - ${factor.title}`);
      }

      // Delete existing tasks for this factor to avoid duplicates
      await client.query('DELETE FROM success_factor_tasks WHERE factor_id = $1', [factor.id]);
      
      // Insert tasks for each stage
      for (const stage of ['Identification', 'Definition', 'Delivery', 'Closure']) {
        const tasks = factor.tasks[stage] || [];
        
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          
          if (task && task.trim()) {
            await client.query(
              'INSERT INTO success_factor_tasks (factor_id, stage, text, "order") VALUES ($1, $2, $3, $4)',
              [factor.id, stage, task, i]
            );
          }
        }
        
        console.log(`Added ${tasks.length} ${stage} tasks for factor ${factor.id}`);
      }
    }

    await client.query('COMMIT');
    console.log('Success factors and tasks have been successfully seeded');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding success factors:', err);
    throw err;
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

async function run() {
  try {
    await seedSuccessFactors();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly (not imported)
if (require.main === module) {
  run();
}

module.exports = { seedSuccessFactors };