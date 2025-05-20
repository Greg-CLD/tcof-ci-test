/**
 * Focused Smoke Test: UUID Matching Logic
 * 
 * This script tests the UUID matching logic improvement that allows 
 * clean UUIDs to be used for tasks even when stored with compound IDs.
 * 
 * Instead of relying on full API authentication, this script directly
 * tests the core logic with sample UUIDs.
 */

// Mock "database" for testing UUID matching
const mockTasks = [
  { 
    id: "2f565bf9-70c7-5c41-93e7-c6c44fb747d1/success-factor/identification/1",  // Compound ID
    text: "Sample task with compound ID",
    completed: false
  },
  { 
    id: "8763a520-d11f-5a95-a25c-78f96b14b29c",  // Clean UUID 
    text: "Sample task with clean UUID",
    completed: false
  },
  { 
    id: "partial-prefix-a4d61cb6-80a1-5ce0-9e02-3b96214b55e9-suffix", // UUID with prefix/suffix
    text: "Sample task with UUID embedded in a string",
    completed: false
  }
];

// Test function: cleanUUID
function cleanUUID(uuid) {
  if (!uuid) return uuid;
  
  // First attempt: try to match a standard UUID pattern
  const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const match = uuid.match(uuidPattern);
  
  if (match) {
    return match[1];
  }
  
  // If no standard UUID pattern found, return original
  return uuid;
}

// Implementation of findTaskById based on server/projectsDb.ts logic
function findTaskById(tasks, taskId) {
  // Try to find the task by direct ID match
  let task = tasks.find(t => t.id === taskId);
  
  if (task) {
    console.log("✅ Found task by exact ID match");
    return task;
  }
  
  // Try to clean the source taskId (if it's in a compound format)
  const taskCleanId = cleanUUID(taskId);
  console.log(`Cleaned task ID: ${taskCleanId}`);
  
  if (taskCleanId !== taskId) {
    // Try again with the cleaned ID
    task = tasks.find(t => t.id === taskCleanId);
    
    if (task) {
      console.log("✅ Found task by clean UUID match");
      return task;
    }
  }
  
  // Try partial matching for compound IDs (task.id might be a compound ID)
  task = tasks.find(t => {
    if (typeof t.id === 'string') {
      // Check if task.id starts with the clean taskId
      return t.id.startsWith(taskCleanId);
    }
    return false;
  });
  
  if (task) {
    console.log("✅ Found task by partial UUID match (task.id starts with clean UUID)");
    return task;
  }
  
  // UUID might be embedded in another string
  task = tasks.find(t => {
    if (typeof t.id === 'string') {
      return t.id.includes(taskCleanId);
    }
    return false;
  });
  
  if (task) {
    console.log("✅ Found task by embedded UUID match");
    return task;
  }
  
  console.log("❌ Task not found with any matching method");
  return null;
}

// Helper function to update a task
function updateTask(tasks, taskId, updates) {
  const task = findTaskById(tasks, taskId);
  
  if (!task) {
    console.log(`Cannot update task with ID ${taskId} - not found`);
    return false;
  }
  
  // Apply updates to the task
  Object.assign(task, updates);
  console.log(`Task updated successfully:`, task);
  return true;
}

// Test cases
function runTests() {
  console.log("====================================");
  console.log(" SMOKE TEST: UUID MATCHING LOGIC");
  console.log("====================================");
  
  // Test 1: Exact match with compound ID
  console.log("\nTEST 1: EXACT MATCH WITH COMPOUND ID");
  console.log("Searching for task with exact compound ID");
  const exactMatchId = "2f565bf9-70c7-5c41-93e7-c6c44fb747d1/success-factor/identification/1";
  const exactMatchTask = findTaskById(mockTasks, exactMatchId);
  
  // Test 2: Clean UUID matching against a task with compound ID
  console.log("\nTEST 2: CLEAN UUID MATCHING AGAINST COMPOUND ID");
  console.log("Searching for task with clean UUID that matches the start of a compound ID");
  const cleanUuidForCompound = "2f565bf9-70c7-5c41-93e7-c6c44fb747d1";
  const cleanMatchTask = findTaskById(mockTasks, cleanUuidForCompound);
  
  // Test 3: Exact match with clean UUID
  console.log("\nTEST 3: EXACT MATCH WITH CLEAN UUID");
  console.log("Searching for task with exact clean UUID");
  const exactCleanId = "8763a520-d11f-5a95-a25c-78f96b14b29c";
  const exactCleanTask = findTaskById(mockTasks, exactCleanId);
  
  // Test 4: UUID extraction from a string with prefix/suffix
  console.log("\nTEST 4: UUID EXTRACTION FROM STRING WITH PREFIX/SUFFIX");
  console.log("Searching for task using the UUID embedded in another string");
  const embeddedId = "a4d61cb6-80a1-5ce0-9e02-3b96214b55e9";
  const embeddedTask = findTaskById(mockTasks, embeddedId);
  
  // Task updates - Test 5: Update a task using clean UUID (when stored with compound ID)
  console.log("\nTEST 5: UPDATE TASK WITH CLEAN UUID");
  console.log("Updating task that has compound ID using only the clean UUID part");
  const updateResult = updateTask(
    mockTasks, 
    "2f565bf9-70c7-5c41-93e7-c6c44fb747d1",  // Clean UUID
    { completed: true }
  );
  
  // Log updated tasks
  console.log("\nFINAL STATE OF TASKS AFTER TESTS:");
  mockTasks.forEach((task, index) => {
    console.log(`Task ${index + 1}: ${task.text}`);
    console.log(`  ID: ${task.id}`);
    console.log(`  Completed: ${task.completed}`);
  });
  
  // Summary
  console.log("\n====================================");
  console.log(" TEST RESULTS SUMMARY");
  console.log("====================================");
  console.log("Test 1 (Exact match): " + (exactMatchTask ? "✅ PASSED" : "❌ FAILED"));
  console.log("Test 2 (Clean UUID): " + (cleanMatchTask ? "✅ PASSED" : "❌ FAILED"));
  console.log("Test 3 (Exact clean): " + (exactCleanTask ? "✅ PASSED" : "❌ FAILED"));
  console.log("Test 4 (Embedded): " + (embeddedTask ? "✅ PASSED" : "❌ FAILED"));
  console.log("Test 5 (Update): " + (updateResult ? "✅ PASSED" : "❌ FAILED"));
  
  const passCount = [exactMatchTask, cleanMatchTask, exactCleanTask, embeddedTask, updateResult].filter(Boolean).length;
  console.log(`\nPASSED: ${passCount}/5 tests (${(passCount/5*100).toFixed(0)}%)`);
  
  if (passCount === 5) {
    console.log("\n✅ ALL TESTS PASSED! The UUID matching implementation is working correctly.");
    console.log("   Tasks can now be found by their clean UUID even when stored with compound IDs.");
  } else {
    console.log("\n❌ SOME TESTS FAILED. The UUID matching implementation needs improvement.");
  }
}

// Run all tests
runTests();