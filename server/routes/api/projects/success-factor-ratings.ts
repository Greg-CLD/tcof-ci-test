import express, { Request, Response } from 'express';
import { db } from '@db';
import { successFactorRatings } from '@shared/schema';
import { resonanceRatingsArraySchema, resonanceRatingsUpdateArraySchema } from '@shared/types/resonance-ratings';
import { isAuthenticated } from '../../../middlewares/isAuthenticated';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const router = express.Router();

// GET /api/projects/:projectId/success-factor-ratings
router.get('/:projectId/success-factor-ratings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const ratings = await db.query.successFactorRatings.findMany({
      where: eq(successFactorRatings.projectId, parseInt(projectId, 10)),
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
    const ratingsToInsert = validatedRatings.map(rating => {
      const record = {
        projectId: parseInt(projectId, 10),
        factorId: rating.factorId,
        resonance: rating.resonance,
        notes: rating.notes || '',
      };
      
      // If ID is provided in the payload, use it (useful for restoring previously deleted ratings)
      if (rating.id) {
        return {
          ...record,
          id: rating.id
        };
      }
      
      return record;
    });
    console.log('ratingsToInsert length:', ratingsToInsert.length);
    console.log('ratingsToInsert:', ratingsToInsert);

    // build the upsert query - use 'as const' to satisfy TypeScript
    const upsertQuery = db
      .insert(successFactorRatings)
      .values(ratingsToInsert as any) // Type assertion to bypass strict type checking
      .onConflictDoUpdate({
        target: [successFactorRatings.projectId, successFactorRatings.factorId],   // unique constraint
        set: {
          resonance: sql`excluded.resonance`,
          notes: sql`excluded.notes`,
          updatedAt: new Date()
        },
      })
      .returning();
      
    // log the generated SQL and parameters
    console.log('UPSERT SQL:', upsertQuery.toSQL());
   
    // execute the query
    const newRatings = await upsertQuery;

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
router.put('/:projectId/success-factor-ratings', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Check if table exists
    const { rows } = await db.execute(sql`SELECT to_regclass('public.success_factor_ratings') as tbl`);
    const result = rows?.[0];
    console.log('PUT - Table existence check result:', {
      tableName: 'success_factor_ratings',
      exists: result?.tbl,
      timestamp: new Date().toISOString()
    });

    if (!result?.tbl) {
      return res.status(500).json({ error: true, message: 'Table success_factor_ratings not found' });
    }

    // Validate input array using the schema that requires IDs
    const validatedRatings = resonanceRatingsUpdateArraySchema.parse(req.body);
    console.log('PUT - validatedRatings:', validatedRatings);

    // Update existing ratings
    const updatedRatings = [];

    for (const rating of validatedRatings) {
      // ID is guaranteed by the schema
      console.log(`Updating rating with ID ${rating.id} for project ${projectId}`);
      
      try {
        const [updated] = await db.update(successFactorRatings)
          .set({
            resonance: rating.resonance,
            notes: rating.notes || null,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(successFactorRatings.id, rating.id),
              eq(successFactorRatings.projectId, parseInt(projectId, 10))
            )
          )
          .returning();

        if (!updated) {
          console.warn(`Rating with ID ${rating.id} not found for project ${projectId}`);
          continue;
        }

        console.log(`Successfully updated rating:`, updated);
        updatedRatings.push(updated);
      } catch (error) {
        console.error(`Error updating rating ${rating.id}:`, error);
        throw error;
      }
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