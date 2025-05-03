import { Database } from '@replit/database';

const db = new Database();

export async function getFactors() {
  const factors = await db.get('factors');
  
  // If no factors found, try migration as fallback
  if (!factors || factors.length === 0) {
    try {
      await import('../../scripts/migrateFactorsToDB.js');
      return await db.get('factors') || [];
    } catch (error) {
      console.error('Failed to load factors from migration script:', error);
      return [];
    }
  }
  
  return factors;
}

export async function saveFactors(newList) {
  await db.set('factors', newList);
}