
import { z } from 'zod';
import { successFactorRatingInsertSchema, successFactorRatingSelectSchema } from '../schema';

/**
 * Validation schema for resonance rating input
 */
export const resonanceRatingSchema = z.object({
  factorId: z.string().min(1, "Factor ID is required"),
  resonance: z.union([
    z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
    z.string().transform(val => {
      const num = parseInt(val);
      if (isNaN(num)) throw new Error("Rating must be a valid number");
      return num;
    })
  ]),
  notes: z.string().optional(),
});

/**
 * Validation schema for an array of ratings (used in batch updates)
 */
export const resonanceRatingsArraySchema = z.array(resonanceRatingSchema);

/**
 * Type for a single resonance evaluation input
 */
export type ResonanceRatingInput = z.infer<typeof resonanceRatingSchema>;

/**
 * Type for a full resonance evaluation record from the database
 */
export type ResonanceRating = z.infer<typeof successFactorRatingSelectSchema>;

/**
 * Type for inserting a new resonance rating
 */
export type InsertResonanceRating = z.infer<typeof successFactorRatingInsertSchema>;

/**
 * Client-side interface for a resonance evaluation
 */
export interface ResonanceEvaluation {
  id: string;
  projectId: number;
  factorId: string;
  resonance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Client-side interface for a resonance evaluation input
 */
export interface EvaluationInput {
  factorId: string;
  resonance: number;
  notes?: string;
}