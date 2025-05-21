/**
 * Task JSON Response Fix
 * 
 * This script adds a dedicated route to catch missing taskId cases
 * to ensure they return JSON responses with appropriate status codes.
 * 
 * Copy and paste this route definition to server/routes.ts BEFORE
 * the existing route definition for PUT /api/projects/:projectId/tasks/:taskId
 */

// Add this BEFORE the existing task PUT route
app.put('/api/projects/:projectId/tasks/', (req, res) => {
  // Catch missing taskId case (trailing slash with no ID)
  return res.status(400).json({
    success: false,
    error: 'INVALID_PARAMETERS',
    message: 'Task ID is required'
  });
});

// Then keep the existing route with taskId parameter
app.put('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
  // Existing implementation...
});