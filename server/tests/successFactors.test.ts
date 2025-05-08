/**
 * Tests for success factors with descriptions
 * This test verifies that success factors can be loaded with descriptions
 */

import { factorsDb, FactorTask } from '../factorsDb';
import fs from 'fs';
import path from 'path';
import { ensureCanonicalFactors } from '../ensureCanonicalFactors';

// Test suite for success factors
describe('Success Factors', () => {
  // Path to the success factors JSON file
  const dataPath = path.join(process.cwd(), 'data', 'successFactors.json');
  
  // Before all tests, ensure we have canonical factors
  beforeAll(async () => {
    // Clear the database first
    factorsDb.clear();
    
    // Run the ensure canonical factors function
    await ensureCanonicalFactors();
    
    // Save the factors to disk if they don't exist
    if (!fs.existsSync(dataPath)) {
      const factors = factorsDb.getAll();
      const dataDir = path.dirname(dataPath);
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(dataPath, JSON.stringify(factors, null, 2));
    }
  });
  
  // Test that success factors are loaded with descriptions
  it('should load success factors with descriptions', () => {
    // Get all factors from the database
    const factors = factorsDb.getAll();
    
    // Verify that we have exactly 12 success factors
    expect(factors.length).toBe(12);
    
    // Check a specific factor to ensure it has a description
    const askWhyFactor = factors.find(f => f.title.includes('Ask Why'));
    
    // Verify the factor exists
    expect(askWhyFactor).toBeDefined();
    expect(askWhyFactor?.id).toBe('sf-1');
    expect(askWhyFactor?.title).toBe('1.1 Ask Why');
    expect(askWhyFactor?.description).toBeDefined();
    
    // Verify all factors have descriptions
    factors.forEach(factor => {
      expect(factor.description).toBeDefined();
      expect(typeof factor.description).toBe('string');
    });
  });
  
  // Test that success factors can be updated with descriptions
  it('should allow updating success factors with descriptions', () => {
    // Get all factors from the database
    const factors = factorsDb.getAll();
    
    // Get the first factor for testing
    const testFactor = factors[0];
    
    // Create an updated version with a new description
    const updatedFactor: FactorTask = {
      ...testFactor,
      description: 'This is an updated description for testing purposes'
    };
    
    // Update the factor in the database
    const updateResult = factorsDb.updateById(testFactor.id, updatedFactor);
    
    // Verify the update was successful
    expect(updateResult).toBe(true);
    
    // Get the updated factor from the database
    const retrievedFactor = factorsDb.findById(testFactor.id);
    
    // Verify the description was updated
    expect(retrievedFactor).toBeDefined();
    expect(retrievedFactor?.description).toBe('This is an updated description for testing purposes');
  });
});