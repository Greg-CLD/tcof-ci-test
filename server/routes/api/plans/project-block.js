import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
// Correct path to projectsDb.js (using .ts instead of .js)
import { projectsDb } from '../../../projectsDb.ts';

// Path to plans data file - need to redefine since we can't import the functions directly
const PLANS_FILE = path.join(process.cwd(), 'data', 'project_plans.json');

// Define local versions of the required functions
function loadProjectPlans() {
  try {
    const data = fs.readFileSync(PLANS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading project plans:', error);
    return [];
  }
}

function saveProjectPlans(plans) {
  try {
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving project plans:', error);
    return false;
  }
}

const router = Router();

/**
 * PATCH to update a specific block of a plan for a project, creating the plan if it doesn't exist
 */
router.patch('/plans/project/:projectId/block/:blockId', async (req, res) => {
  try {
    const { projectId, blockId } = req.params;
    const blockData = req.body;
    
    if (!projectId || !blockId) {
      return res.status(400).json({ 
        message: 'Missing required parameters',
        details: 'Both projectId and blockId are required'
      });
    }
    
    // Verify user has access to this project
    const project = await projectsDb.getProject(projectId);
    const userId = req.user.id;
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to project' });
    }
    
    console.info(`[SERVER] PATCH request for projectId=${projectId}, blockId=${blockId} at ${new Date().toISOString()}`);
    
    // Load the existing plan or create a new one
    let plan = await projectsDb.getProjectPlan(projectId);
    let isNewPlan = false;
    
    if (!plan) {
      console.info(`[SERVER] No existing plan found for projectId=${projectId}, creating a new one`);
      isNewPlan = true;
      plan = {
        id: Math.floor(Date.now() / 1000), // Give the plan a non-null ID
        projectId,
        blocks: {},
        lastUpdated: Date.now()
      };
    } else {
      console.info(`[SERVER] Found existing plan for projectId=${projectId}, id=${plan.id || 'null'}`);
    }
    
    // Ensure blocks object exists and is properly initialized
    plan.blocks = plan.blocks || {};
    
    // Ensure the block exists with a real ID
    if (!plan.blocks[blockId] || !plan.blocks[blockId].id) {
      console.info(`[SERVER] Creating new block record for blockId=${blockId}`);
      plan.blocks[blockId] = {
        ...(plan.blocks[blockId] || {}),
        id: Math.floor(Date.now() / 1000), // Give the block a non-null ID
        createdAt: Date.now()
      };
    } else {
      console.info(`[SERVER] Found existing block record for blockId=${blockId}, id=${plan.blocks[blockId].id}`);
    }
    
    // Debug logging for personal heuristics specifically
    if (blockData.personalHeuristics) {
      console.info(`[SERVER] Received ${blockData.personalHeuristics.length} personal heuristics for block ${blockId}, project ${projectId}`);
      if (blockData.personalHeuristics.length > 0) {
        console.info('[SERVER] First heuristic sample:', JSON.stringify(blockData.personalHeuristics[0]));
      }
    } else {
      console.warn(`[SERVER] Warning: No personal heuristics found in request for block ${blockId}`);
    }
    
    // Check for and fix any invalid success factor ratings 
    if (blockData.successFactorRatings) {
      // Filter out any rating with undefined or "undefined" as factorId
      const cleanedRatings = {};
      let originalKeys = Object.keys(blockData.successFactorRatings);
      let invalidKeysFound = false;
      
      for (const key of originalKeys) {
        if (key && key !== "undefined" && key !== "null") {
          cleanedRatings[key] = blockData.successFactorRatings[key];
        } else {
          invalidKeysFound = true;
          console.warn(`[SERVER] Removing invalid factorId key from ratings: "${key}"`);
        }
      }
      
      if (invalidKeysFound) {
        console.info(`[SERVER] Cleaned success factor ratings object. Original keys: ${originalKeys.length}, Valid keys: ${Object.keys(cleanedRatings).length}`);
        blockData.successFactorRatings = cleanedRatings;
      }
    }
    
    // Update block data while preserving the id and other metadata
    plan.blocks[blockId] = {
      ...plan.blocks[blockId],
      ...blockData,
      id: plan.blocks[blockId].id, // Ensure ID is preserved
      updatedAt: Date.now()
    };
    
    plan.lastUpdated = Date.now();
    
    // Save the updated plan - this will create a new plan if it doesn't exist
    // Use the new updateProjectPlanBlock function which handles upserts
    const updatedPlan = await projectsDb.updateProjectPlanBlock(projectId, blockId, plan.blocks[blockId]);
    
    if (!updatedPlan) {
      console.error(`[SERVER] Failed to update block ${blockId} for project ${projectId}`);
      return res.status(500).json({ 
        message: 'Failed to save project block: update returned null',
      });
    }
    
    console.info(`[SERVER] Plan ${isNewPlan ? 'created' : 'updated'} for projectId=${projectId}`);
    
    // Verify the data was correctly stored before sending response
    const savedPlan = await projectsDb.getProjectPlan(projectId);
    
    if (!savedPlan) {
      console.error(`[SERVER] Failed to retrieve saved plan for projectId=${projectId}`);
      return res.status(500).json({ 
        message: 'Failed to save project block: plan not found after save',
      });
    }
    
    const savedBlockData = savedPlan.blocks?.[blockId];
    
    if (!savedBlockData) {
      console.error(`[SERVER] Failed to retrieve saved block data for blockId=${blockId}`);
      return res.status(500).json({ 
        message: 'Failed to save project block: block not found after save',
      });
    }
    
    // Log verification of saved data
    if (savedBlockData.personalHeuristics) {
      console.info(`[SERVER] Verified ${savedBlockData.personalHeuristics.length} heuristics were saved to database`);
      
      // Detailed verification of personal heuristics consistency
      if (savedBlockData.personalHeuristics.length > 0) {
        console.info('[SERVER] First saved heuristic sample:', JSON.stringify(savedBlockData.personalHeuristics[0]));
        
        // Compare with original data (integrity check)
        if (blockData.personalHeuristics && blockData.personalHeuristics.length > 0) {
          const originalCount = blockData.personalHeuristics.length;
          const savedCount = savedBlockData.personalHeuristics.length;
          
          if (originalCount !== savedCount) {
            console.warn(`[SERVER] Heuristic count mismatch! Original: ${originalCount}, Saved: ${savedCount}`);
          } else {
            console.info(`[SERVER] Heuristic counts match: ${originalCount}`);
            
            // Check first item for field integrity
            const originalFirst = blockData.personalHeuristics[0];
            const savedFirst = savedBlockData.personalHeuristics[0];
            
            if (originalFirst && savedFirst) {
              // Compare text fields
              if (originalFirst.text !== savedFirst.text) {
                console.warn(`[SERVER] Heuristic text mismatch! Original: "${originalFirst.text}", Saved: "${savedFirst.text}"`);
              }
              
              // Compare IDs if present
              if (originalFirst.id && savedFirst.id && originalFirst.id !== savedFirst.id) {
                console.warn(`[SERVER] Heuristic ID mismatch! Original: ${originalFirst.id}, Saved: ${savedFirst.id}`);
              }
            }
          }
        }
      }
    } else {
      console.warn(`[SERVER] Warning: No personal heuristics found in saved data for block ${blockId}`);
      
      // Check if personal heuristics were in the original data but lost in saving
      if (blockData.personalHeuristics && blockData.personalHeuristics.length > 0) {
        console.error(`[SERVER] DATA LOSS DETECTED: ${blockData.personalHeuristics.length} personal heuristics in original data were lost during save!`);
      }
    }
    
    console.info(`[SERVER] Saved block has id=${savedBlockData.id || 'null'}`);
    
    // Return the saved block data like Goal-Mapping does, not just metadata
    return res.status(200).json({
      message: 'Block saved successfully',
      blockId,
      projectId,
      id: savedPlan.id,
      lastUpdated: savedPlan.lastUpdated,
      // Include the actual block data that was saved
      blockData: savedBlockData
    });
  } catch (error) {
    console.error('Error saving project block:', error);
    return res.status(500).json({ 
      message: 'Failed to save project block',
      error: error.message 
    });
  }
});

/**
 * GET to retrieve a specific block of a plan for a project
 */
router.get('/plans/project/:projectId/block/:blockId', async (req, res) => {
  try {
    const { projectId, blockId } = req.params;
    
    if (!projectId || !blockId) {
      return res.status(400).json({ 
        message: 'Missing required parameters',
        details: 'Both projectId and blockId are required'
      });
    }
    
    // Verify user has access to this project
    const project = await projectsDb.getProject(projectId);
    const userId = req.user.id;
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to project' });
    }
    
    console.info(`[SERVER] GET block request for projectId=${projectId}, blockId=${blockId} at ${new Date().toISOString()}`);
    
    // Load the block directly using getProjectPlanBlock
    let block = await projectsDb.getProjectPlanBlock(projectId, blockId);
    
    console.info(`[LOAD-API] GET plans/project/${projectId}/block/${blockId} - Result: ${block ? 'Found' : 'Not found'}`);
    
    if (block) {
      console.info(`[LOAD-API] Full JSON response: ${JSON.stringify(block)}`);
      console.info(`[LOAD-API] Block ID: ${block.id || 'missing'}`);
      console.info(`[LOAD-API] personalHeuristics: ${block.personalHeuristics ? `Found ${block.personalHeuristics.length} heuristics` : 'MISSING'}`);
      
      if (block.personalHeuristics && block.personalHeuristics.length > 0) {
        console.info(`[LOAD-API] First heuristic: ${JSON.stringify(block.personalHeuristics[0])}`);
      }
      
      console.info(`[LOAD-API] successFactorRatings: ${block.successFactorRatings ? 
        `Found (type: ${typeof block.successFactorRatings}, keys: ${Object.keys(block.successFactorRatings || {}).length})` : 'MISSING'}`);
      
      if (block.successFactorRatings) {
        const keys = Object.keys(block.successFactorRatings);
        if (keys.length > 0) {
          const firstKey = keys[0];
          console.info(`[LOAD-API] First rating: ${firstKey} = ${block.successFactorRatings[firstKey]}`);
        }
      }
    }
    
    // Create a default block with proper ID if not found
    if (!block) {
      console.info(`[SERVER] Block not found: blockId=${blockId}, projectId=${projectId}, creating default structure`);
      
      // Create appropriate default structure based on the requested block
      const blockType = req.params.blockId;
      const generatedId = Math.floor(Date.now() / 1000);
      
      if (blockType === 'block1') {
        block = {
          id: generatedId,
          successFactors: [],
          personalHeuristics: [],
          completed: false,
          createdAt: Date.now()
        };
      } else if (blockType === 'block2') {
        block = {
          id: generatedId,
          tasks: [],
          stakeholders: [],
          completed: false,
          createdAt: Date.now()
        };
      } else if (blockType === 'block3') {
        block = {
          id: generatedId,
          timeline: null,
          deliveryApproach: "",
          deliveryNotes: "",
          completed: false,
          createdAt: Date.now()
        };
      } else {
        // Generic empty block for non-standard block IDs
        block = {
          id: generatedId,
          createdAt: Date.now()
        };
      }
      
      console.info(`[SERVER] Returning default block data with id=${generatedId}`);
      return res.status(200).json(block);
    }
    
    // Ensure block has an ID - this is crucial for persistence
    if (!block.id) {
      console.info(`[SERVER] Adding missing ID to existing block ${blockId}`);
      block.id = Math.floor(Date.now() / 1000);
    }
    
    // Add specific default fields based on the block type if they're missing
    if (blockId === 'block1') {
      block.successFactors = block.successFactors || [];
      block.personalHeuristics = block.personalHeuristics || [];
    } else if (blockId === 'block2') {
      block.tasks = block.tasks || [];
      block.stakeholders = block.stakeholders || [];
    } else if (blockId === 'block3') {
      block.timeline = block.timeline || null;
      block.deliveryApproach = block.deliveryApproach || "";
      block.deliveryNotes = block.deliveryNotes || "";
    }
    
    block.completed = !!block.completed;
    
    // Debug logging for personal heuristics specifically
    if (block.personalHeuristics) {
      console.info(`[SERVER] GET request: Found ${block.personalHeuristics.length} personal heuristics for block ${blockId}, project ${projectId}`);
      if (block.personalHeuristics.length > 0) {
        console.info('[SERVER] GET request: First heuristic sample:', JSON.stringify(block.personalHeuristics[0]));
      }
    } else {
      console.warn(`[SERVER] GET request: Warning: No personal heuristics found in block ${blockId} for project ${projectId}`);
    }
    
    console.info(`[SERVER] Returning block data with id=${block.id || 'null'}`);
    return res.status(200).json(block);
  } catch (error) {
    console.error('Error retrieving project block:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve project block',
      error: error.message 
    });
  }
});

/**
 * GET to retrieve an entire plan for a project
 */
router.get('/plans/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!projectId) {
      return res.status(400).json({ 
        message: 'Missing required parameter', 
        details: 'ProjectId is required'
      });
    }
    
    // Verify user has access to this project
    const project = await projectsDb.getProject(projectId);
    const userId = req.user.id;
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (project.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to project' });
    }
    
    console.info(`[SERVER] GET plan request for projectId=${projectId} at ${new Date().toISOString()}`);
    
    // Load the plan
    let plan = await projectsDb.getProjectPlan(projectId);
    
    if (!plan) {
      console.info(`[SERVER] No plan found for projectId=${projectId}, creating a new plan`);
      
      // Generate a real UUID for the plan
      const planId = uuidv4();
      console.info(`[SERVER] Generated new UUID for plan: ${planId}`);
      
      // Create the plan in the database FIRST
      const createdPlan = await projectsDb.createProjectPlan(projectId);
      
      // Check if the plan was created successfully
      if (createdPlan) {
        // Use the ID from the created plan
        console.info(`[SERVER] Plan created successfully with id=${createdPlan.id}`);
        plan = createdPlan;
      } else {
        // Create the plan with the generated UUID if DB creation failed
        console.info(`[SERVER] Creating plan manually with id=${planId}`);
        
        // Create a new plan with proper structure
        plan = {
          id: planId, // Use our generated UUID
          projectId,
          blocks: {
            block1: {
              id: `${planId}_block1`, // Use composite ID to ensure uniqueness
              successFactorRatings: {}, // Initialize as empty object, not array
              personalHeuristics: [],
              completed: false,
              createdAt: Date.now()
            },
            block2: {
              id: `${planId}_block2`,
              tasks: [],
              stakeholders: [],
              completed: false,
              createdAt: Date.now()
            },
            block3: {
              id: `${planId}_block3`,
              timeline: null,
              deliveryApproach: "",
              deliveryNotes: "",
              completed: false,
              createdAt: Date.now()
            }
          },
          lastUpdated: Date.now()
        };
        
        // Save the plan manually
        console.info(`[SERVER] Saving plan manually with id=${planId}`);
        const plans = loadProjectPlans();
        plans.push(plan);
        saveProjectPlans(plans);
      }
      
      // Log plan ID for verification
      console.info(`[SERVER] Final plan id=${plan.id}, type=${typeof plan.id}`);
      
      // Verify plan has a valid ID  
      if (!plan.id) {
        console.error(`[SERVER] ERROR: Plan still has null/undefined ID after creation. Assigning emergency UUID.`);
        plan.id = uuidv4();
      }
    } else {
      console.info(`[SERVER] Found existing plan with id=${plan.id || 'null'}`);
      
      // Fix plan ID if it's null (legacy data)
      if (!plan.id) {
        console.warn(`[SERVER] Fixing null plan ID for existing plan`);
        plan.id = uuidv4();
        
        // Save the updated plan with a proper ID
        const plans = loadProjectPlans();
        const planIndex = plans.findIndex(p => p.projectId === projectId);
        if (planIndex !== -1) {
          plans[planIndex] = plan;
          saveProjectPlans(plans);
          console.info(`[SERVER] Saved plan with new ID: ${plan.id}`);
        } else {
          console.warn(`[SERVER] Couldn't find plan in loaded plans array to update ID`);
        }
      }
      
      // Ensure each block has an ID - this is crucial for persistence
      const blocks = plan.blocks || {};
      ['block1', 'block2', 'block3'].forEach(blockId => {
        if (!blocks[blockId]) {
          console.info(`[SERVER] Creating missing block structure for ${blockId}`);
          blocks[blockId] = {
            id: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
            createdAt: Date.now()
          };
        } else if (!blocks[blockId].id) {
          console.info(`[SERVER] Adding missing ID to existing block ${blockId}`);
          blocks[blockId].id = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
        }
        
        // Add specific default fields based on the block type
        if (blockId === 'block1') {
          blocks[blockId].successFactors = blocks[blockId].successFactors || [];
          blocks[blockId].personalHeuristics = blocks[blockId].personalHeuristics || [];
        } else if (blockId === 'block2') {
          blocks[blockId].tasks = blocks[blockId].tasks || [];
          blocks[blockId].stakeholders = blocks[blockId].stakeholders || [];
        } else if (blockId === 'block3') {
          blocks[blockId].timeline = blocks[blockId].timeline || null;
          blocks[blockId].deliveryApproach = blocks[blockId].deliveryApproach || "";
          blocks[blockId].deliveryNotes = blocks[blockId].deliveryNotes || "";
        }
        
        blocks[blockId].completed = !!blocks[blockId].completed;
      });
      
      plan.blocks = blocks;
    }
    
    return res.status(200).json(plan);
  } catch (error) {
    console.error('Error retrieving project plan:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve project plan',
      error: error.message 
    });
  }
});

export default router;