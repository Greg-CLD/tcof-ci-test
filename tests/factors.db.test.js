import { describe, it, expect, beforeAll } from 'vitest';
import { getFactors } from '../client/src/utils/factorsDB.js';

describe('Factors Database Helper', () => {
  let factors;

  beforeAll(async () => {
    // Load factors from database
    factors = await getFactors();
  });

  it('should load at least 12 factors', () => {
    expect(factors.length).toBeGreaterThanOrEqual(12);
  });

  it('should have first factor with ID 1.1', () => {
    expect(factors[0].id).toBe('1.1');
  });

  it('should have proper structure with tasks by stage', () => {
    const factor = factors[0];
    expect(factor).toHaveProperty('id');
    expect(factor).toHaveProperty('title');
    expect(factor).toHaveProperty('tasks');
    expect(factor.tasks).toHaveProperty('Identification');
    expect(factor.tasks).toHaveProperty('Definition');
    expect(factor.tasks).toHaveProperty('Delivery');
    expect(factor.tasks).toHaveProperty('Closure');
    expect(Array.isArray(factor.tasks.Identification)).toBe(true);
  });
});