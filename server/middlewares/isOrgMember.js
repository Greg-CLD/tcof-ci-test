import { db } from '../db/index.js';
import { organisationMemberships } from '@shared/schema.js';
import { eq, and } from 'drizzle-orm';

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

  const organisationId = req.params.id;
  if (!organisationId) {
    return res.status(400).json({ message: 'Organization ID is required' });
  }

  try {
    const userId = req.user.id;
    
    // Check if the user is a member of the organization
    const membership = await db.query.organisationMemberships.findFirst({
      where: and(
        eq(organisationMemberships.userId, userId),
        eq(organisationMemberships.organisationId, organisationId)
      )
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this organization' });
    }

    // Add membership info to the request object for future use
    req.organisationMembership = membership;
    next();
  } catch (error) {
    console.error('Error checking organization membership:', error);
    res.status(500).json({ message: 'Internal server error' });
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

  const organisationId = req.params.id;
  if (!organisationId) {
    return res.status(400).json({ message: 'Organization ID is required' });
  }

  try {
    const userId = req.user.id;
    
    // Check if the user is an admin or owner of the organization
    const membership = await db.query.organisationMemberships.findFirst({
      where: and(
        eq(organisationMemberships.userId, userId),
        eq(organisationMemberships.organisationId, organisationId),
        // Role must be 'admin' or 'owner'
        eq(organisationMemberships.role, 'admin').or(eq(organisationMemberships.role, 'owner'))
      )
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied: Admin or owner privileges required' });
    }

    // Add membership info to the request object for future use
    req.organisationMembership = membership;
    next();
  } catch (error) {
    console.error('Error checking organization admin privileges:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};