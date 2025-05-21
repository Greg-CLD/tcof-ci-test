// Simplified version to get exactly the changes we need
// We'll use this to extract just the needed changes

// When modifying the real file, only make these two exact changes:
// 1. Change parameter to optional with ":taskId?"
// 2. Add explicit check for undefined taskId

import express from 'express';
const app = express();

// Sample route definition with both required changes
app.put("/api/projects/:projectId/tasks/:taskId?", async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    
    // First validation check (existing)
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "INVALID_PARAMETERS",
        message: "Project ID is required"
      });
    }
    
    // New validation check to add
    if (taskId === undefined) {
      return res.status(400).json({
        success: false,
        error: "INVALID_PARAMETERS",
        message: "Task ID is required"
      });
    }
    
    // Rest of function...
  } catch (error) {
    // Error handling...
  }
});
