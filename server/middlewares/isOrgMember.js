import { db } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';
import { organisationMemberships } from '@shared/schema.js';

/**
 * Middleware to check if the current user is a member of the specified organization
 * 
 * @param {import('express').Request} req Express request object
 * @param {import('express').Response} res Express response object
 * @param {import('express').NextFunction} next Express next function
 * @returns {void}
 */
export const isOrgMember = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const userId = req.user.id;
    const organisationId = req.params.id;
    
    if (!organisationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }
    
    // Find the membership record
    const membership = await db.query.organisationMemberships.findFirst({
      where: and(
        eq(organisationMemberships.userId, userId),
        eq(organisationMemberships.organisationId, organisationId)
      )
    });
    
    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this organization' });
    }
    
    // Add the membership info to the request object for later use
    req.organisationMembership = membership;
    next();
  } catch (error) {
    console.error('Error checking organization membership:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to check if the current user is an admin or owner of the specified organization
 * 
 * @param {import('express').Request} req Express request object
 * @param {import('express').Response} res Express response object
 * @param {import('express').NextFunction} next Express next function
 * @returns {void}
 */
export const isOrgAdminOrOwner = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const userId = req.user.id;
    const organisationId = req.params.id;
    
    if (!organisationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }
    
    // Find the membership record
    const membership = await db.query.organisationMemberships.findFirst({
      where: and(
        eq(organisationMemberships.userId, userId),
        eq(organisationMemberships.organisationId, organisationId)
      )
    });
    
    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this organization' });
    }
    
    // Check if the user is an admin or owner
    if (membership.role !== 'admin' && membership.role !== 'owner') {
      return res.status(403).json({ message: 'You need admin or owner permissions for this action' });
    }
    
    // Add the membership info to the request object for later use
    req.organisationMembership = membership;
    next();
  } catch (error) {
    console.error('Error checking organization admin status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};