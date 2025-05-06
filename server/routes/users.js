/**
 * User profile API routes
 */
import express from 'express';
import { db } from '../../db/index.js';
import { users } from '@shared/schema.ts';
import { userUpdateSchema, passwordChangeSchema } from '@shared/schema.ts';
import { eq } from 'drizzle-orm';
import { comparePasswords, hashPassword } from '../auth.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users/:id
 * Get a user by ID (only allows fetching authenticated user or admin)
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    // Check authorization - user can only get their own profile unless admin
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access to user profile' });
    }
    
    // Get user from database
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        avatarUrl: users.avatarUrl,
        notificationPrefs: users.notificationPrefs,
        locale: users.locale,
        timezone: users.timezone,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id
 * Update a user's profile (only allows authenticated user to update their own profile)
 */
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    // Check authorization - user can only update their own profile
    if (userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to user profile' });
    }
    
    // Validate request body
    const validatedData = userUpdateSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: 'Invalid profile data', 
        errors: validatedData.error.errors 
      });
    }
    
    const updateData = validatedData.data;
    
    // Hash password if provided
    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password);
    }
    
    // Add updatedAt timestamp
    updateData.updatedAt = new Date();
    
    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        avatarUrl: users.avatarUrl,
        notificationPrefs: users.notificationPrefs,
        locale: users.locale,
        timezone: users.timezone,
        updatedAt: users.updatedAt,
      });
    
    return res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/users/:id/change-password
 * Change a user's password (requires current password)
 */
router.post('/:id/change-password', isAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    // Check authorization - user can only update their own password
    if (userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to user account' });
    }
    
    // Validate request body
    const validatedData = passwordChangeSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: 'Invalid password data', 
        errors: validatedData.error.errors 
      });
    }
    
    // Get user from database to check current password
    const [user] = await db
      .select({
        password: users.password,
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isValidPassword = await comparePasswords(
      validatedData.data.currentPassword, 
      user.password
    );
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(validatedData.data.newPassword);
    
    // Update password in database
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    
    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user account (only allows deleting authenticated user's account)
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    // Check authorization - user can only delete their own account
    if (userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to user account' });
    }
    
    // Delete user from database
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the user out
    req.logout((err) => {
      if (err) {
        console.error('Error logging out user after account deletion:', err);
      }
    });
    
    return res.json({ message: 'User account deleted successfully' });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;