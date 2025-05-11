import express, { Request, Response } from 'express';
import { db } from '@db';
import { successFactorRatings } from '@shared/schema';
import { resonanceRatingsArraySchema } from '@shared/types/resonance-ratings';
import { isAuthenticated } from '../../../middlewares/isAuthenticated';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// GET /api/projects/:projectId/success-factor-ratings
router.get('/:projectId/success-factor-ratings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const ratings = await db.query.successFactorRatings.findMany({
      where: eq(successFactorRatings.projectId, projectId),
    });

    res.setHeader('Content-Type', 'application/json');
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching success factor ratings:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to fetch success factor ratings' 
    });
  }
});

// POST /api/projects/:projectId/success-factor-ratings
router.post('/:projectId/success-factor-ratings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Validate input array
    const validatedRatings = resonanceRatingsArraySchema.parse(req.body);

    // Insert new ratings
    const newRatings = await db.insert(successFactorRatings)
      .values(validatedRatings.map(rating => ({
        projectId,
        factorId: rating.factorId,
        resonance: rating.resonance,
        notes: rating.notes
      })))
      .returning();

    res.setHeader('Content-Type', 'application/json');
    res.status(201).json(newRatings);
  } catch (error) {
    console.error('Error creating success factor ratings:', error);
    res.status(400).json({ 
      error: true, 
      message: error instanceof Error ? error.message : 'Failed to create success factor ratings'
    });
  }
});

// PUT /api/projects/:projectId/success-factor-ratings
router.put('/:projectId/success-factor-ratings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Validate input array
    const validatedRatings = resonanceRatingsArraySchema.parse(req.body);

    // Update existing ratings
    const updatedRatings = [];

    for (const rating of validatedRatings) {
      if (!rating.id) {
        throw new Error('Rating ID is required for updates');
      }

      const [updated] = await db.update(successFactorRatings)
        .set({
          resonance: rating.resonance,
          notes: rating.notes,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(successFactorRatings.id, rating.id),
            eq(successFactorRatings.projectId, projectId)
          )
        )
        .returning();

      if (!updated) {
        throw new Error(`Rating with ID ${rating.id} not found`);
      }

      updatedRatings.push(updated);
    }

    res.setHeader('Content-Type', 'application/json');
    res.json(updatedRatings);
  } catch (error) {
    console.error('Error updating success factor ratings:', error);
    res.status(400).json({ 
      error: true, 
      message: error instanceof Error ? error.message : 'Failed to update success factor ratings'
    });
  }
});

export default router;