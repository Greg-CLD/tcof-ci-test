import express from 'express';
import { db } from '../../db/index.js';
import { 
  organisations, 
  organisationMemberships, 
  organisationHeuristics,
  projects,
  organisationInsertSchema,
  organisationHeuristicInsertSchema,
  organisationMembershipInsertSchema
} from '@shared/schema.js';
import { isOrgMember, isOrgAdminOrOwner } from '../middlewares/isOrgMember.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const router = express.Router();

/**
 * GET /api/organisations
 * Get all organizations where the current user is a member
 */
router.get('/', async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const userId = req.user.id;

    // Get all organizations where user is a member
    const userOrganisations = await db.query.organisationMemberships.findMany({
      where: eq(organisationMemberships.userId, userId),
      with: {
        organisation: true
      },
      orderBy: desc(organisationMemberships.updatedAt)
    });

    // Map to return only the organization details with role
    const result = userOrganisations.map(membership => ({
      id: membership.organisation.id,
      name: membership.organisation.name,
      description: membership.organisation.description,
      createdAt: membership.organisation.createdAt,
      updatedAt: membership.organisation.updatedAt,
      role: membership.role
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/organisations
 * Create a new organization and add the current user as an owner
 */
router.post('/', async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const userId = req.user.id;

    // Validate input
    const orgSchema = organisationInsertSchema.pick({
      name: true,
      description: true
    });

    let validatedData;
    try {
      validatedData = orgSchema.parse(req.body);
    } catch (validationError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationError.errors 
      });
    }

    // Create the organization
    const [newOrganisation] = await db.insert(organisations)
      .values({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Add the current user as an owner
    await db.insert(organisationMemberships)
      .values({
        userId,
        organisationId: newOrganisation.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date()
      });

    return res.status(201).json(newOrganisation);
  } catch (error) {
    console.error('Error creating organization:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/organisations/:id
 * Get organization details by ID
 */
router.get('/:id', isOrgMember, async (req, res) => {
  try {
    const organisationId = req.params.id;

    const organisation = await db.query.organisations.findFirst({
      where: eq(organisations.id, organisationId)
    });

    if (!organisation) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    return res.status(200).json({
      ...organisation,
      role: req.organisationMembership.role
    });
  } catch (error) {
    console.error('Error fetching organization details:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/organisations/:id/projects
 * Get all projects in an organization
 */
router.get('/:id/projects', isOrgMember, async (req, res) => {
  try {
    const organisationId = req.params.id;

    // Only select fields that we know exist in the projects table
    console.log(`Fetching projects for organisation ${organisationId}`);
    const organisationProjects = await db.query.projects.findMany({
      where: eq(projects.organisationId, organisationId),
      orderBy: desc(projects.createdAt), // Use createdAt for ordering instead of updatedAt
      columns: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        organisationId: true // Make sure this field is included
      }
    });

    console.log(`Found ${organisationProjects.length} projects:`, JSON.stringify(organisationProjects));

    return res.status(200).json(organisationProjects);
  } catch (error) {
    console.error('Error fetching organization projects:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/organisations/:id/projects
 * Create a new project in an organization
 */
router.post('/:id/projects', isOrgMember, async (req, res) => {
  try {
    const userId = req.user.id;
    const organisationId = req.params.id;
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    // Import the v4 UUID generator
    const { v4: uuidv4 } = await import('uuid');

    // Generate a UUID for the project ID
    const projectId = uuidv4();

    console.log(`Generating UUID for new project: ${projectId}`);

    // Create the project with organization ID - using ONLY fields that actually exist in the database
    const [newProject] = await db.insert(projects)
      .values({
        id: projectId, // Set explicit UUID for the project
        name: name.trim(),
        description: description?.trim() || null,
        userId: userId, // Include user ID as creator (matches user_id column)
        organisationId, // Set organization ID from URL parameter
        createdAt: new Date(), // This maps to created_at
        lastUpdated: new Date() // This maps to last_updated
      })
      .returning();

    console.log(`Created new project in organisation ${organisationId}:`, JSON.stringify(newProject));

    return res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project in organization:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/organisations/:id/heuristics
 * Get all heuristics for an organization
 */
router.get('/:id/heuristics', isOrgMember, async (req, res) => {
  try {
    const organisationId = req.params.id;

    const heuristics = await db.query.organisationHeuristics.findMany({
      where: eq(organisationHeuristics.organisationId, organisationId),
      orderBy: desc(organisationHeuristics.updatedAt)
    });

    return res.status(200).json(heuristics);
  } catch (error) {
    console.error('Error fetching organization heuristics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * PUT /api/organisations/:id/heuristics
 * Replace all heuristics for an organization (bulk update)
 */
router.put('/:id/heuristics', isOrgAdminOrOwner, async (req, res) => {
  try {
    const organisationId = req.params.id;

    // Validate input array
    const heuristicsArraySchema = z.array(
      organisationHeuristicInsertSchema.omit({
        id: true,
        organisationId: true,
        createdAt: true,
        updatedAt: true
      })
    );

    let validatedData;
    try {
      validatedData = heuristicsArraySchema.parse(req.body);
    } catch (validationError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationError.errors 
      });
    }

    // Begin transaction
    await db.transaction(async (tx) => {
      // Delete existing heuristics
      await tx.delete(organisationHeuristics)
        .where(eq(organisationHeuristics.organisationId, organisationId));

      // Insert new heuristics if there are any
      if (validatedData.length > 0) {
        const heuristicsToInsert = validatedData.map(heuristic => ({
          ...heuristic,
          organisationId,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await tx.insert(organisationHeuristics).values(heuristicsToInsert);
      }
    });

    // Fetch the updated heuristics
    const updatedHeuristics = await db.query.organisationHeuristics.findMany({
      where: eq(organisationHeuristics.organisationId, organisationId),
      orderBy: desc(organisationHeuristics.updatedAt)
    });

    return res.status(200).json(updatedHeuristics);
  } catch (error) {
    console.error('Error updating organization heuristics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/organisations/:id/members
 * Add a new member to the organization
 */
router.post('/:id/members', isOrgAdminOrOwner, async (req, res) => {
  try {
    const organisationId = req.params.id;

    // Validate input
    const memberSchema = z.object({
      userId: z.number().int().positive(),
      role: z.enum(['member', 'admin']), // Owner role can only be set at organization creation
    });

    let validatedData;
    try {
      validatedData = memberSchema.parse(req.body);
    } catch (validationError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationError.errors 
      });
    }

    // Check if user already has a membership
    const existingMembership = await db.query.organisationMemberships.findFirst({
      where: and(
        eq(organisationMemberships.userId, validatedData.userId),
        eq(organisationMemberships.organisationId, organisationId)
      )
    });

    if (existingMembership) {
      return res.status(409).json({ message: 'User is already a member of this organization' });
    }

    // Add the new member
    const [newMembership] = await db.insert(organisationMemberships)
      .values({
        userId: validatedData.userId,
        organisationId,
        role: validatedData.role,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return res.status(201).json(newMembership);
  } catch (error) {
    console.error('Error adding organization member:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * DELETE /api/organisations/:id
 * Delete an organization and all associated data (projects, memberships, heuristics)
 * Only organization owners can delete organizations
 */
router.delete('/:id', async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const organisationId = req.params.id;
    const userId = req.user.id;

    // Check if user is an owner of this organization
    const membership = await db.query.organisationMemberships.findFirst({
      where: and(
        eq(organisationMemberships.userId, userId),
        eq(organisationMemberships.organisationId, organisationId),
        eq(organisationMemberships.role, 'owner')
      )
    });

    if (!membership) {
      return res.status(403).json({ 
        message: 'Only organization owners can delete organizations' 
      });
    }

    // Begin transaction to delete all related data
    await db.transaction(async (tx) => {
      // Delete all projects in the organization
      console.log(`Deleting all projects for organisation ${organisationId}`);
      await tx.delete(projects)
        .where(eq(projects.organisationId, organisationId));

      // Delete all heuristics
      console.log(`Deleting all heuristics for organisation ${organisationId}`);
      await tx.delete(organisationHeuristics)
        .where(eq(organisationHeuristics.organisationId, organisationId));

      // Delete all memberships
      console.log(`Deleting all memberships for organisation ${organisationId}`);
      await tx.delete(organisationMemberships)
        .where(eq(organisationMemberships.organisationId, organisationId));

      // Finally delete the organization itself
      console.log(`Deleting organisation ${organisationId}`);
      await tx.delete(organisations)
        .where(eq(organisations.id, organisationId));
    });

    return res.status(200).json({ 
      message: 'Organization deleted successfully',
      id: organisationId
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;