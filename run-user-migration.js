/**
 * Script to run the user profile fields migration
 */
import { exec } from 'child_process';

exec('tsx db/migrations/add_user_profile_fields.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing migration: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Migration stderr: ${stderr}`);
    return;
  }
  
  console.log(stdout);
});