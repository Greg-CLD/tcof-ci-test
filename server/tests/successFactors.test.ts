/**
 * Success factors database tests
 * Tests that descriptions are properly loaded and stored in the success_factors table
 */

import { factorsDb, FactorTask } from '../factorsDb';
import { ensureCanonicalFactors } from '../ensureCanonicalFactors';
import fs from 'fs';
import path from 'path';

// Test the success factors descriptions
describe('Success Factors', () => {
  
  // Load the raw data from the JSON file to compare
  let jsonFactors: FactorTask[];
  
  beforeAll(() => {
    const factorsPath = path.join(process.cwd(), 'data', 'successFactors.json');
    if (fs.existsSync(factorsPath)) {
      const data = fs.readFileSync(factorsPath, 'utf8');
      jsonFactors = JSON.parse(data) as FactorTask[];
    } else {
      jsonFactors = [];
    }
  });
  
  it('should load success factors with descriptions', async () => {
    // Run the ensure canonical factors function
    await ensureCanonicalFactors();
    
    // Get all factors from the database
    const factors = factorsDb.getAll();
    
    // Check that we have exactly 12 factors
    expect(factors.length).toBe(12);
    
    // Check that each factor has a description
    factors.forEach(factor => {
      expect(factor.description).toBeDefined();
      expect(typeof factor.description).toBe('string');
      expect(factor.description.length).toBeGreaterThan(0);
    });
    
    // Check some specific descriptions - just verify a few key ones
    const askWhy = factors.find(f => f.id === 'sf-1');
    expect(askWhy).toBeDefined();
    expect(askWhy?.description).toContain('Define clear, achievable goals');
    
    const thinkBig = factors.find(f => f.id === 'sf-7');
    expect(thinkBig).toBeDefined();
    expect(thinkBig?.description).toContain('Break solutions into manageable modules');
  });
  
  it('should store success factors to JSON with descriptions', async () => {
    // Check that the factors in the database match what's saved in the JSON
    const factors = factorsDb.getAll();
    
    if (jsonFactors.length > 0) {
      // For existing factors in the JSON, check if they now have descriptions
      jsonFactors.forEach(jsonFactor => {
        const dbFactor = factors.find(f => f.id === jsonFactor.id);
        expect(dbFactor).toBeDefined();
        
        if (dbFactor) {
          // Check if title matches
          expect(dbFactor.title).toBe(jsonFactor.title);
          
          // Check if the description exists
          expect(dbFactor.description).toBeDefined();
          expect(typeof dbFactor.description).toBe('string');
          expect(dbFactor.description.length).toBeGreaterThan(0);
        }
      });
    }
  });
});