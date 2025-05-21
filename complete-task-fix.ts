/**
 * Fix for PUT /api/projects/:projectId/tasks/ endpoint to ensure
 * it always returns JSON responses with appropriate status codes.
 * 
 * The fix involves:
 * 1. Making the taskId parameter optional with :taskId?
 * 2. Adding explicit check for when taskId is undefined
 */

// Copy and paste this to fix server/routes.ts
app.put("/api/projects/:projectId/tasks/:taskId?", async (req, res) => {
  // Handler implementation...
  try {
    const { projectId, taskId } = req.params;
    
    // Validate projectId (existing check)
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "INVALID_PARAMETERS",
        message: "Project ID is required"
      });
    }
    
    // Add this check for undefined taskId
    if (taskId === undefined) {
      return res.status(400).json({
        success: false,
        error: "INVALID_PARAMETERS", 
        message: "Task ID is required"
      });
    }
    
    // Existing code continues...
  } catch (error) {
    // Error handling...
  }
});
