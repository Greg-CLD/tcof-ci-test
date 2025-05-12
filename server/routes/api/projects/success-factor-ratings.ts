import express, { Request, Response } from 'express';
import { db } from '@db';
import { successFactorRatings } from '@shared/schema';
import { resonanceRatingsArraySchema } from '@shared/types/resonance-ratings';
import { isAuthenticated } from '../../../middlewares/isAuthenticated';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

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
    console.log('→ HIT POST /api/projects/' + projectId + '/success-factor-ratings');
    console.log('RAW body:', JSON.stringify(req.body, null, 2));

    // ----- table-existence check (safe) -----
    const { rows } = await db.execute(
      sql`SELECT to_regclass('public.success_factor_ratings') AS tbl`
    );
    if (!rows?.[0]?.tbl) {
      return res.status(500).json({ error: true, message: 'Table success_factor_ratings not found' });
    }
    // ----------------------------------------

    // Ensure req.body is treated as an array
    const inputData = Array.isArray(req.body) ? req.body : [req.body];

    // Validate input array
    const validatedRatings = resonanceRatingsArraySchema.parse(inputData);
    console.log('validatedRatings:', validatedRatings);

    // Map the validated ratings for insertion
    const ratingsToInsert = validatedRatings.map(rating => ({
      projectId,
      factorId: rating.factorId,
      resonance: rating.resonance,
      notes: rating.notes || ''
    }));
    console.log('ratingsToInsert length:', ratingsToInsert.length);
    console.log('ratingsToInsert:', ratingsToInsert);

    // Insert or update ratings using UPSERT
    const newRatings = await db
      .insert(successFactorRatings)
      .values(ratingsToInsert)
      .onConflictDoUpdate({
        target: ['project_id', 'factor_id'],   // unique constraint
        set: ({ excluded }) => ({
          resonance: excluded.resonance,
          notes: excluded.notes,
          updatedAt: new Date()
        }),
      })
      .returning();

    console.log('returning rows:', newRatings);
    console.log('newRatings:', newRatings);

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

    // Check if table exists
    const [result] = await db.execute(sql`SELECT to_regclass('public.success_factor_ratings') as tbl`);
    console.log('PUT - Table existence check result:', {
      tableName: 'success_factor_ratings',
      exists: result.tbl,
      timestamp: new Date().toISOString()
    });

    if (!result.tbl) {
      return res.status(500).json({ error: true, message: 'Table success_factor_ratings not found' });
    }

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