/**
 * CLI Test for Missing taskId Handler
 * 
 * This script simulates Express routing to verify our fix for the missing taskId case
 * 
 * Run with:
 *   node test-fix-cli.js
 */

// Mini Express router simulator
function simulateExpressRouter() {
  const router = {
    routes: {},
    put: function(path, handler) {
      this.routes[path] = handler;
    },
    handleRequest: function(method, path, params, body) {
      console.log(`Handling ${method} request to ${path}`);
      
      // Find matching route
      const routePattern = Object.keys(this.routes).find(pattern => {
        // Convert Express route pattern to regex
        const regexPattern = pattern
          .replace(/:[^/]+\?/g, '([^/]*)') // Optional parameters
          .replace(/:[^/]+/g, '([^/]+)');  // Required parameters
          
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
      });
      
      if (!routePattern) {
        return { status: 404, body: { error: 'Not Found' } };
      }
      
      // Call the handler with mock req and res
      let statusCode = 200;
      let responseBody = null;
      
      const req = { params, body };
      const res = {
        status: function(status) {
          statusCode = status;
          return this;
        },
        json: function(data) {
          responseBody = data;
          return this;
        }
      };
      
      // Execute the handler
      this.routes[routePattern](req, res);
      
      return {
        status: statusCode,
        body: responseBody
      };
    }
  };
  
  return router;
}

// Create mock Express router
const app = simulateExpressRouter();

// Add our route handler with the fix
app.put("/api/projects/:projectId/tasks/:taskId?", async (req, res) => {
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
    
    // In a real handler, we'd process the task update here
    return res.status(200).json({
      success: true,
      message: "Task updated successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: error.message || "Unknown error"
    });
  }
});

// Test cases
console.log("TEST 1: Valid request with taskId");
const result1 = app.handleRequest(
  "PUT", 
  "/api/projects/test-project/tasks/test-task", 
  { projectId: "test-project", taskId: "test-task" },
  { completed: true }
);
console.log("Status:", result1.status);
console.log("Response:", JSON.stringify(result1.body, null, 2));
console.log();

console.log("TEST 2: Request with missing taskId");
const result2 = app.handleRequest(
  "PUT", 
  "/api/projects/test-project/tasks/", 
  { projectId: "test-project", taskId: undefined },
  { completed: true }
);
console.log("Status:", result2.status);
console.log("Response:", JSON.stringify(result2.body, null, 2));
console.log();

console.log("TEST 3: Request with empty taskId");
const result3 = app.handleRequest(
  "PUT", 
  "/api/projects/test-project/tasks/", 
  { projectId: "test-project", taskId: "" },
  { completed: true }
);
console.log("Status:", result3.status);
console.log("Response:", JSON.stringify(result3.body, null, 2));
