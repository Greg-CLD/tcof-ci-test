/**
 * Utility script to create an admin user with correct integer ID type
 */
import { db } from './db';
import { users } from '@shared/schema';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

export async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, 'admin')
    });
    
    if (existingUser) {
      console.log('Admin user already exists with ID:', existingUser.id);
      return existingUser;
    }
    
    const hashedPassword = await hashPassword('admin123');
    
    // Create admin user
    const [admin] = await db.insert(users).values({
      id: 999999, // Integer ID
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      createdAt: new Date()
    }).returning();
    
    console.log('Admin user created with ID:', admin.id);
    return admin;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}