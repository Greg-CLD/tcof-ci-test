// Import functionality for client-side storage
let db;

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Initialize storage based on environment
if (isBrowser) {
  // In browser, use localStorage as fallback
  db = {
    async get(key) {
      const value = localStorage.getItem(`db_${key}`);
      return value ? JSON.parse(value) : null;
    },
    async set(key, value) {
      localStorage.setItem(`db_${key}`, JSON.stringify(value));
    }
  };
} else {
  // In Node.js environment, use Replit Database
  // Dynamic import will be used on the server
  try {
    // Note: This will never actually run in the browser
    // It's just code to make the server-side version work
    const { default: Database } = await import('@replit/database');
    db = new Database();
  } catch (error) {
    console.error('Failed to initialize Replit Database:', error);
    // Create a fallback in-memory database for the server
    const memoryDb = {};
    db = {
      async get(key) {
        return memoryDb[key];
      },
      async set(key, value) {
        memoryDb[key] = value;
      }
    };
  }
}

export async function getFactors() {
  const factors = await db.get('factors');
  
  // If no factors found, try to load default data or request migration
  if (!factors || factors.length === 0) {
    if (isBrowser) {
      try {
        // In browser environment, try to fetch factors from API
        console.log('No factors found in storage, fetching from API...');
        const response = await fetch('/api/admin/tcof-tasks');
        if (response.ok) {
          const data = await response.json();
          // Store the data
          await saveFactors(data);
          return data;
        } else {
          console.error('Failed to fetch factors from API');
          return [];
        }
      } catch (error) {
        console.error('Error fetching factors:', error);
        return [];
      }
    } else {
      // In Node.js environment, we could run the migration
      console.log('No factors found in server DB');
      return [];
    }
  }
  
  return factors;
}

export async function saveFactors(newList) {
  await db.set('factors', newList);
}