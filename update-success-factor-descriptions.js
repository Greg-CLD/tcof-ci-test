/**
 * Script to update success factors with descriptions via the API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the success factors data file
const factorsPath = path.join(__dirname, 'data', 'successFactors.json');

// The canonical success factors with descriptions
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

async function updateFactorDescriptions() {
  try {
    console.log('Starting success factor description update...');
    
    // Check if the file exists
    if (!fs.existsSync(factorsPath)) {
      console.error(`ERROR: Success factors file not found at ${factorsPath}`);
      return;
    }
    
    // Read the file
    const fileData = fs.readFileSync(factorsPath, 'utf8');
    const factors = JSON.parse(fileData);
    
    console.log(`Found ${factors.length} success factors in data file.`);
    
    // Update the descriptions in the local file
    let updatedCount = 0;
    const updatedFactors = factors.map(factor => {
      // Find the corresponding canonical factor
      const canonicalFactor = CANONICAL_FACTORS.find(cf => 
        cf.id === factor.id || cf.title === factor.title
      );
      
      if (canonicalFactor && (!factor.description || factor.description === '')) {
        updatedCount++;
        // Update the description
        return {
          ...factor,
          description: canonicalFactor.description
        };
      }
      
      return factor;
    });
    
    if (updatedCount > 0) {
      // Write the updated factors back to the file
      fs.writeFileSync(factorsPath, JSON.stringify(updatedFactors, null, 2));
      console.log(`Updated descriptions for ${updatedCount} factors.`);
    } else {
      console.log('No factors needed description updates.');
    }
    
    // Verify all factors now have descriptions
    const missingDescriptions = updatedFactors.filter(factor => !factor.description);
    if (missingDescriptions.length > 0) {
      console.error(`WARNING: ${missingDescriptions.length} factors still missing descriptions.`);
      missingDescriptions.forEach(factor => {
        console.error(`- ${factor.id}: ${factor.title}`);
      });
    } else {
      console.log('All factors now have descriptions. Update successful!');
    }
  } catch (error) {
    console.error('Error updating factor descriptions:', error);
  }
}

// Run the update
updateFactorDescriptions().catch(console.error);