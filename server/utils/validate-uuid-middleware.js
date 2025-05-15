/**
 * Middleware to validate project IDs in requests to ensure they are UUIDs
 * This is a critical defense against using numeric IDs after the migration
 */

const { isValidUUID, isNumericId } = require('./uuid-utils.cjs');

/**
 * Middleware to validate that projectId parameters are valid UUIDs
 * Rejects requests with numeric project IDs
 */
function validateProjectId(req, res, next) {
  // Get project ID from various possible locations in the request
  const projectId = req.params.projectId || req.params.id || req.body.projectId;
  
  if (!projectId) {
    // ID wasn't provided, proceed to next middleware
    return next();
  }
  
  // Check if it's a numeric ID
  if (isNumericId(projectId)) {
    console.error(`Rejected request with numeric project ID: ${projectId}`);
    return res.status(400).json({ 
      message: "Invalid project ID format. Numeric IDs are no longer supported.", 
      error: "NUMERIC_ID_NOT_SUPPORTED",
      projectId
    });
  }
  
  // Check if it's a valid UUID
  if (!isValidUUID(projectId)) {
    console.error(`Rejected request with invalid project ID format: ${projectId}`);
    return res.status(400).json({ 
      message: "Invalid project ID format. Must be a valid UUID.", 
      error: "INVALID_UUID_FORMAT",
      projectId
    });
  }
  
  // Valid UUID provided, continue
  next();
}

module.exports = { validateProjectId };
