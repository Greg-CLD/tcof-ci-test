/**
 * Script to set a password for an existing user
 */
const crypto = require('crypto');
const { db } = require('./server/db');

// Password hashing function
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${hash}.${salt}`;
}

async function setUserPassword() {
  try {
    console.log('Setting password for greg@confluity.co.uk');
    
    // First find the user
    const user = await db.execute(`
      SELECT * FROM users WHERE email = $1 OR username = $1
    `, ['greg@confluity.co.uk']);
    
    if (!user || user.length === 0) {
      console.log('User not found!');
      return;
    }
    
    console.log('User found, setting password...');
    
    // Set a simple password for testing (confluity123)
    const hashedPassword = hashPassword('confluity123');
    
    // Update the user password
    await db.execute(`
      UPDATE users 
      SET password = $1 
      WHERE id = $2
    `, [hashedPassword, user[0].id]);
    
    console.log(`Password set successfully for user with ID: ${user[0].id}`);
  } catch (error) {
    console.error('Error setting password:', error);
  } finally {
    process.exit(0);
  }
}

setUserPassword();