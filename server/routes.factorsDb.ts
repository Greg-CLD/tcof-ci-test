// This file contains the database-backed implementation of the success factors API
// It's designed to be a drop-in replacement for the current file-based implementation

import type { Express, Request, Response } from "express";
import { factorsDb, type FactorTask } from './factorsDbNew';
import fs from 'fs';
import path from 'path';
import { ensureCanonicalFactors } from './ensureCanonicalFactorsNew';
// Import auth middleware
import { isAuthenticated } from './auth-simple';

// Define the admin middleware
function isAdmin(req: Request, res: Response, next: any) {
  // First check if the user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Get the user from the request
  const user = req.user as any;
  
  // Only allow the admin user (greg@confluity.co.uk)
  if (user && user.username && user.username.toLowerCase() === 'greg@confluity.co.uk') {
    return next();
  }
  
  // Otherwise reject with forbidden status
  return res.status(403).json({ message: "Admin access required" });
}

export async function registerSuccessFactorsRoutes(app: Express) {
  // Initialize the factors database
  console.log("Initializing factors database during registerRoutes...");
  try {
    // Count factors in the database
    const dbFactors = await factorsDb.getAll();
    
    if (dbFactors.length === 0) {
      // No factors in database, need to seed from JSON
      console.log("No factors found in database, seeding from JSON file...");
      
      const factorsPath = path.join(process.cwd(), 'data', 'successFactors.json');
      if (fs.existsSync(factorsPath)) {
        const data = fs.readFileSync(factorsPath, 'utf8');
        const parsed = JSON.parse(data) as FactorTask[];
        
        // Seed the database
        await factorsDb.setAll(parsed);
        console.log(`Loaded ${parsed.length} factors from disk into database`);
      } else {
        console.warn("Warning: successFactors.json not found, database may be empty");
      }
    } else {
      console.log(`Database already initialized with ${dbFactors.length} success factors`);
    }
    
    // Ensure canonical factors are present
    await ensureCanonicalFactors();
    
    console.log("Factors database initialized successfully");
  } catch (error) {
    console.error("Error initializing factors database:", error);
  }

  // Register the API routes
  
  // Public endpoint to get success factors - now using async/await with the database
  app.get('/api/success-factors', async (req, res) => {
    try {
      // Get success factors from the database-backed factorsDb
      const successFactors = await factorsDb.getAll();

      // Transform the data to match the structure needed by the client
      const formattedFactors = successFactors.map(factor => ({
        id: factor.id,
        factor: factor.title,
        description: factor.description || (factor.tasks 
          ? `Tasks for various project stages (${Object.keys(factor.tasks).length} stages available)`
          : 'No description available'),
        category: factor.category || 'Uncategorized'
      }));

      res.json(formattedFactors);
    } catch (error: any) {
      console.error('Error fetching success factors:', error);
      res.status(500).json({ 
        message: 'Failed to load success factors', 
        details: error.message 
      });
    }
  });

  // Admin-only endpoints for managing success factors
  
  // Get all success factors (admin only)
  app.get('/api/admin/success-factors', isAdmin, async (req: Request, res: Response) => {
    try {
      const factors = await getFactors();
      res.json(factors || []);
    } catch (error: unknown) {
      console.error('Error getting success factors:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get success factors';
      res.status(500).json({ message: errorMessage });
    }
  });

  // Get a specific success factor by ID (admin only)
  app.get('/api/admin/success-factors/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const factorId = req.params.id;
      const factor = await factorsDb.findById(factorId);
      
      if (!factor) {
        return res.status(404).json({ message: `Success factor with ID ${factorId} not found` });
      }
      
      res.json(factor);
    } catch (error: unknown) {
      console.error(`Error getting success factor with ID ${req.params.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get success factor';
      res.status(500).json({ message: errorMessage });
    }
  });

  // Create a new success factor (admin only)
  app.post('/api/admin/success-factors', isAdmin, async (req: Request, res: Response) => {
    try {
      const newFactor = req.body;
      
      // Generate a new ID if none provided
      if (!newFactor.id) {
        // Find the highest sf-XX number and increment
        const factors = await factorsDb.getAll();
        const maxId = factors.reduce((max, factor) => {
          if (factor.id && factor.id.startsWith('sf-')) {
            const num = parseInt(factor.id.replace('sf-', ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }
          return max;
        }, 0);
        
        newFactor.id = `sf-${maxId + 1}`;
      }
      
      // Ensure tasks structure is valid
      newFactor.tasks = newFactor.tasks || {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      };
      
      // Add to database
      await factorsDb.add(newFactor);
      
      res.status(201).json(newFactor);
    } catch (error: unknown) {
      console.error('Error creating success factor:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create success factor';
      res.status(500).json({ message: errorMessage });
    }
  });

  // Update a success factor (admin only)
  app.put('/api/admin/success-factors/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const factorId = req.params.id;
      const updatedFactor = req.body;
      
      // Ensure ID matches
      if (updatedFactor.id !== factorId) {
        return res.status(400).json({ message: 'ID in body does not match ID in URL' });
      }
      
      // Update in database
      const success = await factorsDb.updateById(factorId, updatedFactor);
      
      if (!success) {
        return res.status(404).json({ message: `Success factor with ID ${factorId} not found` });
      }
      
      res.json(updatedFactor);
    } catch (error: unknown) {
      console.error(`Error updating success factor with ID ${req.params.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update success factor';
      res.status(500).json({ message: errorMessage });
    }
  });

  // Delete a success factor (admin only)
  app.delete('/api/admin/success-factors/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const factorId = req.params.id;
      
      // Delete from database
      const success = await factorsDb.removeById(factorId);
      
      if (!success) {
        return res.status(404).json({ message: `Success factor with ID ${factorId} not found` });
      }
      
      res.status(204).send();
    } catch (error: unknown) {
      console.error(`Error deleting success factor with ID ${req.params.id}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete success factor';
      res.status(500).json({ message: errorMessage });
    }
  });

  // Helper function to get all factors with error handling
  async function getFactors(forceRefresh: boolean = false): Promise<FactorTask[]> {
    try {
      // Get factors from database
      return await factorsDb.getAll();
    } catch (error) {
      console.error('Error getting factors from database:', error);
      throw error;
    }
  }
}