import { storage as dbStorage } from '@/lib/storageAdapter';
import { storage as browserStorage } from '@/lib/browserStorage';

const FACTORS_KEY = 'successFactors';

// Extended storage interface for factors that matches what the JS factorStore expects
export const factorsStorage = {
  get: async (key: string): Promise<any> => {
    try {
      // Try to get from dbStorage first
      const result = await dbStorage.load(key);
      if (result) return result;
      
      // Fall back to browser storage
      return await browserStorage.get(key);
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  },
  
  set: async (key: string, value: any): Promise<void> => {
    try {
      // Save to browser storage for immediate access
      await browserStorage.set(key, value);
      
      // Also try to save to dbStorage
      try {
        await dbStorage.save(key, value);
      } catch (dbError) {
        console.warn(`Could not save to dbStorage, but saved to browserStorage:`, dbError);
      }
    } catch (error) {
      console.error(`Error saving ${key} to storage:`, error);
      throw error;
    }
  },
  
  delete: async (key: string): Promise<void> => {
    try {
      // Delete from both storage systems
      await browserStorage.delete(key);
      await dbStorage.delete(key);
    } catch (error) {
      console.error(`Error deleting ${key} from storage:`, error);
      throw error;
    }
  },
  
  list: async (prefix: string = ''): Promise<string[]> => {
    try {
      // Combine results from both storage systems
      const browserKeys = await browserStorage.list(prefix);
      const dbKeys = await dbStorage.list();
      
      // Filter dbKeys by prefix
      const filteredDbKeys = dbKeys.filter(key => key.startsWith(prefix));
      
      // Combine and remove duplicates
      return [...new Set([...browserKeys, ...filteredDbKeys])];
    } catch (error) {
      console.error(`Error listing keys with prefix ${prefix}:`, error);
      return [];
    }
  }
};