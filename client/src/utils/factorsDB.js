let db;

const isBrowser = typeof window !== 'undefined';

if (isBrowser) {
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
  try {
    if (typeof window === 'undefined') {
      const { default: Database } = await import('@replit/database');
      db = new Database();
    } else {
      throw new Error('Cannot import @replit/database in browser');
    }
  } catch (error) {
    console.error('Failed to initialize Replit Database:', error);
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