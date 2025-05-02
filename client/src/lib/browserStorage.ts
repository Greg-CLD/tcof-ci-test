/**
 * Simple client-side storage adapter
 * Provides localStorage persistence with Replit Database API compatibility
 */

// Interface that matches Replit Database methods we use
interface StorageInterface {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

/**
 * LocalStorageAdapter implements a Replit DB compatible interface
 * but uses browser localStorage for persistence
 */
class LocalStorageAdapter implements StorageInterface {
  // Get a value from localStorage
  async get(key: string): Promise<any> {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  // Set a value in localStorage
  async set(key: string, value: any): Promise<void> {
    if (typeof value !== 'string') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, value);
    }
  }

  // Delete a key from localStorage
  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  // List keys with a given prefix
  async list(prefix: string = ''): Promise<string[]> {
    return Object.keys(localStorage).filter(key => key.startsWith(prefix));
  }
}

// Export a singleton instance
export const storage = new LocalStorageAdapter();