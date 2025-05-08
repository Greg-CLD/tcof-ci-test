import { z } from 'zod';

/**
 * Personal heuristic schema 
 */
export const heuristicSchema = z.object({
  id: z.string().optional(), // Optional for new heuristics, will be generated on save
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
});

/**
 * Type for a personal heuristic
 */
export type PersonalHeuristic = z.infer<typeof heuristicSchema>;

/**
 * Personal heuristics array schema
 */
export const heuristicsArraySchema = z.array(heuristicSchema);