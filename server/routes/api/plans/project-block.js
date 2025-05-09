import { Router } from 'express';
// Correct path to projectsDb.js
import { projectsDb } from '../../../projectsDb.js';

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
    
    // Load the existing plan or create a new one
    let plan = await projectsDb.getProjectPlan(projectId);
    
    if (!plan) {
      plan = {
        projectId,
        blocks: {},
        lastUpdated: Date.now()
      };
    }
    
    // Update the specific block
    plan.blocks = plan.blocks || {};
    
    // Debug logging for personal heuristics specifically
    if (blockData.personalHeuristics) {
      console.log(`[SERVER] Received ${blockData.personalHeuristics.length} personal heuristics for block ${blockId}, project ${projectId}`);
      if (blockData.personalHeuristics.length > 0) {
        console.log('[SERVER] First heuristic sample:', JSON.stringify(blockData.personalHeuristics[0]));
      }
    } else {
      console.log(`[SERVER] Warning: No personal heuristics found in request for block ${blockId}`);
    }
    
    plan.blocks[blockId] = blockData;
    plan.lastUpdated = Date.now();
    
    // Save the updated plan
    await projectsDb.saveProjectPlan(projectId, plan);
    
    // Verify the data was correctly stored before sending response
    const savedPlan = await projectsDb.getProjectPlan(projectId);
    const savedBlockData = savedPlan?.blocks?.[blockId];
    
    if (savedBlockData?.personalHeuristics) {
      console.log(`[SERVER] Verified ${savedBlockData.personalHeuristics.length} heuristics were saved to database`);
    } else {
      console.log(`[SERVER] Warning: No personal heuristics found in saved data for block ${blockId}`);
    }
    
    // Return the saved block data like Goal-Mapping does, not just metadata
    return res.status(200).json({
      message: 'Block saved successfully',
      blockId,
      projectId,
      lastUpdated: plan.lastUpdated,
      // Include the actual block data that was saved
      blockData: savedBlockData || plan.blocks[blockId]
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
    
    // Load the plan
    const plan = await projectsDb.getProjectPlan(projectId);
    
    if (!plan || !plan.blocks || !plan.blocks[blockId]) {
      console.log(`[SERVER] Block not found: blockId=${blockId}, projectId=${projectId}`);
      return res.status(404).json({ 
        message: 'Block not found',
        details: `Block "${blockId}" not found for project "${projectId}"`
      });
    }
    
    // Debug logging for personal heuristics specifically
    const blockData = plan.blocks[blockId];
    
    if (blockData.personalHeuristics) {
      console.log(`[SERVER] GET request: Found ${blockData.personalHeuristics.length} personal heuristics for block ${blockId}, project ${projectId}`);
      if (blockData.personalHeuristics.length > 0) {
        console.log('[SERVER] GET request: First heuristic sample:', JSON.stringify(blockData.personalHeuristics[0]));
      }
    } else {
      console.log(`[SERVER] GET request: Warning: No personal heuristics found in block ${blockId} for project ${projectId}`);
    }
    
    return res.status(200).json(blockData);
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
    
    // Load the plan
    const plan = await projectsDb.getProjectPlan(projectId);
    
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
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