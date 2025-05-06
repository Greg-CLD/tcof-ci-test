/**
 * Script to run the user profile fields migration
 */
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationPath = resolve(__dirname, 'db/migrations/add_user_profile_fields.js');

console.log(`Running user profile fields migration from ${migrationPath}...`);

// Execute the migration script
exec(`node --experimental-modules --es-module-specifier-resolution=node ${migrationPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Migration error: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Migration stderr: ${stderr}`);
  }
  
  console.log(`Migration output: ${stdout}`);
  console.log('User profile fields migration completed');
});