
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.createHash('sha256');
  hash.update(password + salt);
  return hash.digest('hex') + '.' + salt;
}

async function setUserPassword() {
  const client = await pool.connect();
  
  try {
    console.log('Setting password for greg@confluity.co.uk');
    
    // Hash the new password
    const hashedPassword = hashPassword('confluity123');
    
    // Update user with new password
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, 'greg@confluity.co.uk']
    );
    
    if (result.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    console.log(`Password updated successfully for user ID: ${result.rows[0].id}`);
    
  } catch (error) {
    console.error('Error setting password:', error);
  } finally {
    client.release();
  }
}

setUserPassword().then(() => process.exit(0));
