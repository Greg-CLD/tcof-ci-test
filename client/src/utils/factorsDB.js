// Initialize db with a default implementation using localStorage
let db = {
  async get(key) {
    const value = localStorage.getItem(`db_${key}`);
    return value ? JSON.parse(value) : null;
  },
  async set(key, value) {
    localStorage.setItem(`db_${key}`, JSON.stringify(value));
  }
};

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Only attempt to initialize Replit DB in a Node.js environment (not browser)
if (!isBrowser) {
  // Use dynamic import with a try/catch to avoid breaking browser builds
  try {
    // Wrap in an IIFE to allow for top-level await in browser environments
    (async () => {
      // Only import in Node environment
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const { default: Database } = await import('@replit/database');
        db = new Database();
        console.log('Replit Database initialized in server environment');
      }
    })().catch(err => {
      console.error('Error initializing Replit Database:', err);
    });
  } catch (error) {
    console.error('Failed to initialize Replit Database:', error);
    // Fall back to in-memory DB for server-side if Replit DB fails
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
  
  if (!factors || factors.length === 0) {
    if (isBrowser) {
      try {
        const response = await fetch('/api/admin/tcof-tasks');
        if (response.ok) {
          const data = await response.json();
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
      console.log('No factors found in server DB');
      return [];
    }
  }
  
  return factors;
}

export async function saveFactors(newList) {
  await db.set('factors', newList);
}