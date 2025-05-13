import { Express, Request, Response } from "express";
import { factorsDb } from "./factorsDbNew.direct";
import { log } from "./vite";

// Check if the user is an admin
function isAdmin(req: Request, res: Response, next: any) {
  const user = req.user as any;
  
  // Check if the user exists and has isAdmin flag
  if (user && user.isAdmin) {
    return next();
  }
  
  return res.status(403).json({
    error: true,
    message: "Unauthorized: Admin access required"
  });
}

export async function registerSuccessFactorsRoutes(app: Express) {
  try {
    // Initialize the database before registering routes
    console.log('Initializing factors database during registerRoutes...');
    
    if (await factorsDb.initialize()) {
      console.log('Factors database initialized successfully');
    } else {
      console.error('Failed to initialize factors database');
    }

    // Get all success factors (admin only)
    app.get('/api/admin/success-factors', async (req: Request, res: Response) => {
      try {
        // For admin API, we don't need to check isAdmin since some non-admin pages
        // also need to list all factors (the factors are not sensitive data)
        const factors = await factorsDb.getAll();
        res.json(factors);
      } catch (error) {
        console.error('Error fetching success factors:', error);
        res.status(500).json({
          error: true, 
          message: `Failed to fetch success factors: ${error}`
        });
      }
    });

    // Get a specific success factor by ID (admin only)
    app.get('/api/admin/success-factors/:id', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const factor = await factorsDb.findById(id);
        
        if (!factor) {
          return res.status(404).json({
            error: true,
            message: `Success factor with ID ${id} not found`
          });
        }
        
        res.json(factor);
      } catch (error) {
        console.error(`Error fetching success factor with ID ${req.params.id}:`, error);
        res.status(500).json({
          error: true,
          message: `Failed to fetch success factor: ${error}`
        });
      }
    });

    // Create a new success factor (admin only)
    app.post('/api/admin/success-factors', isAdmin, async (req: Request, res: Response) => {
      try {
        const factor = req.body;
        
        // Basic validation
        if (!factor.title) {
          return res.status(400).json({
            error: true,
            message: 'Success factor must have a title'
          });
        }
        
        // Add missing fields if needed
        if (!factor.tasks) {
          factor.tasks = {
            Identification: [],
            Definition: [],
            Delivery: [],
            Closure: []
          };
        }
        
        await factorsDb.add(factor);
        const allFactors = await factorsDb.getAll();
        
        res.status(201).json({
          message: 'Success factor created successfully',
          factors: allFactors
        });
      } catch (error) {
        console.error('Error creating success factor:', error);
        res.status(500).json({
          error: true,
          message: `Failed to create success factor: ${error}`
        });
      }
    });

    // Update a specific success factor by ID (admin only)
    app.put('/api/admin/success-factors/:id', isAdmin, async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const updatedFactor = req.body;
        
        // Basic validation
        if (!updatedFactor.title) {
          return res.status(400).json({
            error: true,
            message: 'Success factor must have a title'
          });
        }
        
        // Make sure the ID in the URL matches the ID in the body
        updatedFactor.id = id;
        
        // Check if factor exists
        const existingFactor = await factorsDb.findById(id);
        if (!existingFactor) {
          return res.status(404).json({
            error: true,
            message: `Success factor with ID ${id} not found`
          });
        }
        
        // Update the factor
        const success = await factorsDb.updateById(id, updatedFactor);
        
        if (!success) {
          return res.status(500).json({
            error: true,
            message: `Failed to update success factor with ID ${id}`
          });
        }
        
        // Return all factors after update
        const allFactors = await factorsDb.getAll();
        
        res.json({
          message: 'Success factor updated successfully',
          factors: allFactors
        });
      } catch (error) {
        console.error(`Error updating success factor with ID ${req.params.id}:`, error);
        res.status(500).json({
          error: true,
          message: `Failed to update success factor: ${error}`
        });
      }
    });

    // Delete a specific success factor by ID (admin only)
    app.delete('/api/admin/success-factors/:id', isAdmin, async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        // Check if factor exists
        const existingFactor = await factorsDb.findById(id);
        if (!existingFactor) {
          return res.status(404).json({
            error: true,
            message: `Success factor with ID ${id} not found`
          });
        }
        
        // Delete the factor
        const success = await factorsDb.removeById(id);
        
        if (!success) {
          return res.status(500).json({
            error: true,
            message: `Failed to delete success factor with ID ${id}`
          });
        }
        
        // Return all factors after deletion
        const allFactors = await factorsDb.getAll();
        
        res.json({
          message: 'Success factor deleted successfully',
          factors: allFactors
        });
      } catch (error) {
        console.error(`Error deleting success factor with ID ${req.params.id}:`, error);
        res.status(500).json({
          error: true,
          message: `Failed to delete success factor: ${error}`
        });
      }
    });
  } catch (error) {
    console.error('Error registering success factors routes:', error);
  }
}