/**
 * Ensures that the database contains exactly the 12 canonical TCOF success factors
 * with the correct titles. This function should be called on server startup.
 */

import { factorsDb, FactorTask } from './factorsDb';

// The canonical list of TCOF success factors
const CANONICAL_FACTORS = [
  { id: 'sf-1', title: '1.1 Ask Why' },
  { id: 'sf-2', title: '1.2 Get a Masterbuilder' },
  { id: 'sf-3', title: '1.3 Get Your People on the Bus' },
  { id: 'sf-4', title: '1.4 Make Friends and Keep them Friendly' },
  { id: 'sf-5', title: '2.1 Recognise that your project is not unique' },
  { id: 'sf-6', title: '2.2 Look for Tried & Tested Options' },
  { id: 'sf-7', title: '3.1 Think Big, Start Small' },
  { id: 'sf-8', title: '3.2 Learn by Experimenting' },
  { id: 'sf-9', title: '3.3 Keep on top of risks' },
  { id: 'sf-10', title: '4.1 Adjust for optimism' },
  { id: 'sf-11', title: '4.2 Measure What Matters, Be Ready to Step Away' },
  { id: 'sf-12', title: '4.3 Be Ready to Adapt' }
];

export async function ensureCanonicalFactors(): Promise<boolean> {
  try {
    // Get all current factors
    const currentFactors = factorsDb.getAll();
    
    // Check if we need to update (count != 12 or titles don't match)
    let needsUpdate = currentFactors.length !== 12;
    
    if (!needsUpdate) {
      // Check if all titles match the canonical ones
      for (let i = 0; i < 12; i++) {
        const currentFactor = currentFactors.find(f => f.id === CANONICAL_FACTORS[i].id);
        if (!currentFactor || currentFactor.title !== CANONICAL_FACTORS[i].title) {
          needsUpdate = true;
          break;
        }
      }
    }
    
    if (needsUpdate) {
      console.info('Starting canonical factors refresh');
      
      // Create a map to store all tasks from existing factors by title
      const tasksByTitle: Record<string, FactorTask['tasks']> = {};
      
      // First collect all tasks from existing factors, grouped by canonical title
      currentFactors.forEach(factor => {
        // Find the canonical factor that most closely matches this one
        const canonicalFactor = CANONICAL_FACTORS.find(cf => 
          cf.title === factor.title || 
          cf.id === factor.id ||
          cf.title.toLowerCase().includes(factor.title.toLowerCase()) ||
          factor.title.toLowerCase().includes(cf.title.toLowerCase())
        );
        
        if (canonicalFactor) {
          // Initialize tasks for this title if not already done
          if (!tasksByTitle[canonicalFactor.title]) {
            tasksByTitle[canonicalFactor.title] = {
              Identification: [],
              Definition: [],
              Delivery: [],
              Closure: []
            };
          }
          
          // Merge the tasks
          ['Identification', 'Definition', 'Delivery', 'Closure'].forEach(stage => {
            const stageTasks = factor.tasks[stage as keyof typeof factor.tasks] || [];
            tasksByTitle[canonicalFactor.title][stage as keyof typeof factor.tasks] = [
              ...tasksByTitle[canonicalFactor.title][stage as keyof typeof factor.tasks],
              ...stageTasks
            ];
          });
        }
      });
      
      // Empty the database
      factorsDb.clear();
      
      // Add the canonical factors with their collected tasks
      CANONICAL_FACTORS.forEach(cf => {
        const tasks = tasksByTitle[cf.title] || {
          Identification: [],
          Definition: [],
          Delivery: [],
          Closure: []
        };
        
        // Create a new factor with the canonical ID and title
        const factor: FactorTask = {
          id: cf.id,
          title: cf.title,
          tasks: {
            Identification: tasks.Identification || [],
            Definition: tasks.Definition || [],
            Delivery: tasks.Delivery || [],
            Closure: tasks.Closure || []
          }
        };
        
        // Add to the database
        factorsDb.add(factor);
      });
      
      console.info('Canonical factors refreshed successfully');
      return true;
    }
    
    return false; // No update needed
  } catch (error) {
    console.error('Error ensuring canonical factors:', error);
    return false;
  }
}