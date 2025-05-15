
import { query } from './server/direct-db';

async function queryProjects() {
  try {
    const results = await query('SELECT id, name FROM projects');
    console.log('Projects:', results);
  } catch (error) {
    console.error('Query error:', error);
  }
}

queryProjects();
