/**
 * Ensures that the database contains exactly the 12 canonical TCOF success factors
 * with the correct titles. This function should be called on server startup.
 * This version uses the database instead of JSON files.
 */

import { factorsDb, FactorTask } from './factorsDbNew';

/**
 * The canonical list of TCOF success factors with descriptions
 */
const CANONICAL_FACTORS = [
  { id: 'sf-1', title: '1.1 Ask Why', description: 'Define clear, achievable goals that solve known problems.' },
  { id: 'sf-2', title: '1.2 Get a Masterbuilder', description: 'Find a capable leader with relevant experience who can guide the project.' },
  { id: 'sf-3', title: '1.3 Get Your People on the Bus', description: 'Build a cohesive team and identify champions to drive the change.' },
  { id: 'sf-4', title: '1.4 Make Friends and Keep them Friendly', description: 'Engage stakeholders early and maintain their support throughout the project.' },
  { id: 'sf-5', title: '2.1 Recognise that your project is not unique', description: 'Learn from similar past projects to avoid repeating mistakes.' },
  { id: 'sf-6', title: '2.2 Look for Tried & Tested Options', description: 'Use proven solutions instead of reinventing the wheel.' },
  { id: 'sf-7', title: '3.1 Think Big, Start Small', description: 'Break solutions into manageable modules that can be built incrementally.' },
  { id: 'sf-8', title: '3.2 Learn by Experimenting', description: 'Test ideas with small experiments and adjust based on feedback.' },
  { id: 'sf-9', title: '3.3 Keep on top of risks', description: 'Identify and mitigate risks continuously throughout the project.' },
  { id: 'sf-10', title: '4.1 Adjust for optimism', description: 'Account for typical optimism bias in estimates and forecasts.' },
  { id: 'sf-11', title: '4.2 Measure What Matters, Be Ready to Step Away', description: 'Focus on measurable outcomes and be prepared to pivot if goals are not being met.' },
  { id: 'sf-12', title: '4.3 Be Ready to Adapt', description: 'Maintain flexibility to adapt to changing requirements and circumstances.' }
];

export async function ensureCanonicalFactors(): Promise<boolean> {
  try {
    console.info('Starting canonical factors refresh with database');
    
    // Get all current factors
    const currentFactors = await factorsDb.getAll();
    
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
      console.info('Updates needed for canonical factors');
      
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
      
      // For each canonical factor, prepare the updated factor data
      const updatedFactors: FactorTask[] = CANONICAL_FACTORS.map(cf => {
        const tasks = tasksByTitle[cf.title] || {
          Identification: [],
          Definition: [],
          Delivery: [],
          Closure: []
        };
        
        // Create a new factor with the canonical ID, title, and description
        return {
          id: cf.id,
          title: cf.title,
          description: cf.description || '',
          tasks: {
            Identification: tasks.Identification || [],
            Definition: tasks.Definition || [],
            Delivery: tasks.Delivery || [],
            Closure: tasks.Closure || []
          }
        };
      });
      
      // Update all factors in the database in one batch operation
      await factorsDb.setAll(updatedFactors);
      
      console.info('Canonical factors refreshed successfully in database');
      return true;
    } else {
      console.info('No updates needed for canonical factors in database');
      return false; // No update needed
    }
  } catch (error) {
    console.error('Error ensuring canonical factors in database:', error);
    return false;
  }
}