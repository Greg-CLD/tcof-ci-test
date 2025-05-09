import { z } from 'zod';

/**
 * Personal heuristic schema 
 * 
 * Note: Includes alternative field names to ensure compatibility
 * with different components across the application
 */
export const heuristicSchema = z.object({
  id: z.string().optional(), // Optional for new heuristics, will be generated on save
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  // Alternative field names for compatibility
  text: z.string().optional(), // Alternative to name in some components
  notes: z.string().optional(), // Alternative to description in some components
  favourite: z.boolean().optional().default(false),
});

/**
 * Type for a personal heuristic
 */
export type PersonalHeuristic = z.infer<typeof heuristicSchema>;

/**
 * Personal heuristics array schema
 */
export const heuristicsArraySchema = z.array(heuristicSchema);