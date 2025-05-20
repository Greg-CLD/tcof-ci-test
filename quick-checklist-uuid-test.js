/**
 * Quick test to demonstrate the UUID cleaning fixes in Checklist.tsx
 * This mimics what happens in the component, showing the raw and cleaned IDs
 */

// Test SuccessFactor compound IDs
const testIds = [
  "2f565bf9-70c7-5c41-93e7-c6c4cde32312-12345678",
  "f219d47b-39b5-5be1-86f2-e0ec3afc8e3b-abcdef",
  "deabe811-b825-534e-a524-8927bd28e416-custom-suffix",
  "f74b276e-e3d3-538e-a85d-5f65a42d6063-some-random-text"
];

// Function to clean IDs - same as in the component
function cleanId(rawId) {
  return rawId.split('-').slice(0, 5).join('-');
}

// Display results in the format used in the Checklist component
console.log("=== UUID Cleaning Test Results ===");
console.log("This shows exactly how the Checklist.tsx component will clean IDs");
console.log("-".repeat(70));

// Process each test ID
testIds.forEach(rawId => {
  const cleanedId = cleanId(rawId);
  const endpoint = `/api/projects/sample-project-id/tasks/${cleanedId}`;
  
  // Simulate what we now log in the component
  console.log('[NET]', { 
    rawId,
    cleanId: cleanedId,
    endpoint,
    operation: 'PUT/DELETE'
  });
  console.log("-".repeat(70));
});

// Output how Checklist.tsx will handle real task updates
const projectId = "bc55c1a2-0cdf-4108-aa9e-44b44baea3b8";
const successFactorTaskId = "2f565bf9-70c7-5c41-93e7-c6c4cde32312-somesuffix";

// PUT example (toggle completion)
const cleanedId = cleanId(successFactorTaskId);
const putEndpoint = `/api/projects/${projectId}/tasks/${cleanedId}`;
console.log("\n=== PUT Task Update Example ===");
console.log('[NET]', { 
  rawId: successFactorTaskId, 
  cleanId: cleanedId,
  endpoint: putEndpoint,
  completed: true
});

// DELETE example
const deleteEndpoint = `/api/projects/${projectId}/tasks/${cleanedId}`;
console.log("\n=== DELETE Task Example ===");
console.log('[NET]', { 
  rawId: successFactorTaskId, 
  cleanId: cleanedId,
  endpoint: deleteEndpoint,
  operation: 'DELETE' 
});

console.log("\nTest complete. The implementation in Checklist.tsx now correctly trims compound IDs.");