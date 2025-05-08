/**
 * Test script to verify that success factors descriptions are properly loaded
 */
import { factorsDb, FactorTask } from './server/factorsDb.js';
import { ensureCanonicalFactors } from './server/ensureCanonicalFactors.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple test runner
const test = async (name, fn) => {
  try {
    console.log(`✅ Running test: ${name}`);
    await fn();
    console.log(`✓ Test passed: ${name}`);
  } catch (error) {
    console.error(`❌ Test failed: ${name}`);
    console.error(error);
    process.exit(1);
  }
};

// Assert function
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
};

// Run tests
(async () => {
  console.log('Testing success factors descriptions...');
  
  // First test - ensure canonical factors
  await test('Ensure canonical factors loads descriptions', async () => {
    await ensureCanonicalFactors();
    
    // Get all factors from the database
    const factors = factorsDb.getAll();
    
    // Check that we have exactly 12 factors
    assert(factors.length === 12, `Expected 12 factors, got ${factors.length}`);
    
    // Check that each factor has a description
    for (const factor of factors) {
      assert(factor.description !== undefined, `Factor ${factor.id} has no description`);
      assert(typeof factor.description === 'string', `Factor ${factor.id} description is not a string`);
      assert(factor.description.length > 0, `Factor ${factor.id} has an empty description`);
    }
    
    // Check some specific descriptions
    const askWhy = factors.find(f => f.id === 'sf-1');
    assert(askWhy, 'Could not find factor "1.1 Ask Why"');
    assert(askWhy.description.includes('Define clear, achievable goals'), 
      `Unexpected description for "1.1 Ask Why": ${askWhy.description}`);
    
    const thinkBig = factors.find(f => f.id === 'sf-7');
    assert(thinkBig, 'Could not find factor "3.1 Think Big, Start Small"');
    assert(thinkBig.description.includes('Break solutions into manageable modules'), 
      `Unexpected description for "3.1 Think Big, Start Small": ${thinkBig.description}`);
    
    console.log('All factors have valid descriptions');
  });
  
  // Second test - check JSON file persistence
  await test('Success factors stored to JSON with descriptions', async () => {
    // Check if the factors in the database would be saved to JSON properly
    const factorsPath = path.join(__dirname, 'data', 'successFactors.json');
    let jsonFactors = [];
    
    if (fs.existsSync(factorsPath)) {
      const data = fs.readFileSync(factorsPath, 'utf8');
      jsonFactors = JSON.parse(data);
      console.log(`Found ${jsonFactors.length} factors in JSON file`);
      
      // If the file exists and has factors, ensure they have descriptions
      if (jsonFactors.length > 0) {
        const dbFactors = factorsDb.getAll();
        
        for (const jsonFactor of jsonFactors) {
          const dbFactor = dbFactors.find(f => f.id === jsonFactor.id);
          assert(dbFactor, `Factor ${jsonFactor.id} from JSON not found in database`);
          
          if (dbFactor) {
            assert(dbFactor.title === jsonFactor.title, 
              `Title mismatch for ${jsonFactor.id}: JSON: "${jsonFactor.title}", DB: "${dbFactor.title}"`);
            
            assert(dbFactor.description !== undefined, 
              `Factor ${dbFactor.id} has no description in database`);
            assert(typeof dbFactor.description === 'string', 
              `Factor ${dbFactor.id} description is not a string in database`);
            assert(dbFactor.description.length > 0, 
              `Factor ${dbFactor.id} has an empty description in database`);
          }
        }
      }
    }
    
    console.log('Success factors database and JSON file are consistent');
  });
  
  console.log('All tests passed successfully!');
})();