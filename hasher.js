import { createHash, randomBytes } from 'crypto';

// Generate a SHA-256 hash with salt
function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = createHash('sha256');
  hash.update(password + salt);
  return hash.digest('hex') + '.' + salt;
}

// Parse arguments
const password = process.argv[2];

if (!password) {
  console.error('Usage: node hasher.js <password>');
  process.exit(1);
}

// Generate and display the hash
const hashedPassword = hashPassword(password);
console.log(hashedPassword);