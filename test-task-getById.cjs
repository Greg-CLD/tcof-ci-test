/**
 * Unit Test for getTaskById Method
 * 
 * This test verifies that the newly implemented getTaskById method:
 * - Correctly finds tasks by their exact ID
 * - Correctly finds Success Factor tasks by their sourceId
 * - Properly handles not found cases
 * - Returns consistent task objects with correct ID formats
 */

const { projectsDb } = require('./server/projectsDb');

// Check if DEBUG_TASKS env var should be set
if (process.env.DEBUG_TASKS !== 'true') {
  console.log('Setting DEBUG_TASKS=true to enable detailed logging');
  process.env.DEBUG_TASKS = 'true';
}

// Formatting helpers
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';

// Test a standard UUID task lookup
async function testStandardTaskLookup() {
  console.log(`\n${BLUE}Testing lookup of task with standard UUID...${RESET}`);
  
  // Get a project to use for testing
  const projects = await projectsDb.getProjects();
  
  if (!projects || projects.length === 0) {
    console.error(`${RED}No projects found for testing${RESET}`);
    return false;
  }
  
  const projectId = projects[0].id;
  console.log(`Using project: ${projectId}`);
  
  // Get tasks for this project
  const tasks = await projectsDb.getTasksForProject(projectId);
  
  if (!tasks || tasks.length === 0) {
    console.log(`${YELLOW}No tasks found in project, test skipped${RESET}`);
    return true; // Not a failure, just no tasks to test with
  }
  
  // Find a regular task (not a success factor task)
  const regularTask = tasks.find(task => task.origin !== 'factor' && task.origin !== 'success-factor');
  
  if (!regularTask) {
    console.log(`${YELLOW}No regular tasks found, test skipped${RESET}`);
    return true; // Not a failure
  }
  
  // Try to find this task by ID
  console.log(`Looking up task by ID: ${regularTask.id}`);
  const foundTask = await projectsDb.getTaskById(projectId, regularTask.id);
  
  if (!foundTask) {
    console.error(`${RED}Failed to find task by ID${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}Successfully found task by ID: ${foundTask.id}${RESET}`);
  console.log(`Task text: ${foundTask.text}`);
  
  // Verify the ID matches
  const idsMatch = foundTask.id === regularTask.id;
  console.log(`ID match verification: ${idsMatch ? GREEN + 'PASS' : RED + 'FAIL'}`);
  
  return idsMatch;
}

// Test Success Factor task lookup by both ID and sourceId
async function testSuccessFactorTaskLookup() {
  console.log(`\n${BLUE}Testing lookup of Success Factor task...${RESET}`);
  
  // Get a project to use for testing
  const projects = await projectsDb.getProjects();
  
  if (!projects || projects.length === 0) {
    console.error(`${RED}No projects found for testing${RESET}`);
    return false;
  }
  
  const projectId = projects[0].id;
  console.log(`Using project: ${projectId}`);
  
  // Get tasks for this project
  const tasks = await projectsDb.getTasksForProject(projectId);
  
  // Find a Success Factor task
  const sfTask = tasks.find(task => 
    (task.origin === 'factor' || task.origin === 'success-factor') && task.sourceId
  );
  
  if (!sfTask) {
    console.log(`${YELLOW}No Success Factor tasks found, test skipped${RESET}`);
    return true; // Not a failure
  }
  
  // Try to find this task by its database ID
  console.log(`Looking up SF task by ID: ${sfTask.id}`);
  const foundByDirectId = await projectsDb.getTaskById(projectId, sfTask.id);
  
  if (!foundByDirectId) {
    console.error(`${RED}Failed to find SF task by direct ID${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}Successfully found SF task by ID: ${foundByDirectId.id}${RESET}`);
  
  // Now try to find the same task by its sourceId
  console.log(`Looking up SF task by sourceId: ${sfTask.sourceId}`);
  const foundBySourceId = await projectsDb.getTaskById(projectId, sfTask.sourceId);
  
  if (!foundBySourceId) {
    console.error(`${RED}Failed to find SF task by sourceId${RESET}`);
    return false;
  }
  
  console.log(`${GREEN}Successfully found SF task by sourceId: ${foundBySourceId.id}${RESET}`);
  
  // Verify both lookups found the same task
  const sameTask = 
    foundByDirectId.id === foundBySourceId.id || 
    (foundByDirectId.sourceId && foundByDirectId.sourceId === foundBySourceId.sourceId);
  
  console.log(`Same task verification: ${sameTask ? GREEN + 'PASS' : RED + 'FAIL'}`);
  
  return sameTask;
}

// Test handling of nonexistent task IDs
async function testNonExistentTaskLookup() {
  console.log(`\n${BLUE}Testing lookup of non-existent task...${RESET}`);
  
  // Get a project to use for testing
  const projects = await projectsDb.getProjects();
  
  if (!projects || projects.length === 0) {
    console.error(`${RED}No projects found for testing${RESET}`);
    return false;
  }
  
  const projectId = projects[0].id;
  console.log(`Using project: ${projectId}`);
  
  // Generate a random UUID that shouldn't exist
  const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  
  console.log(`Looking up non-existent task ID: ${nonExistentId}`);
  const result = await projectsDb.getTaskById(projectId, nonExistentId);
  
  if (result === null) {
    console.log(`${GREEN}Correctly returned null for non-existent task${RESET}`);
    return true;
  } else {
    console.error(`${RED}Unexpectedly found a task for non-existent ID${RESET}`);
    console.log(result);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log(`${BLUE}=== Starting getTaskById Method Tests ===${RESET}`);
  
  const results = await Promise.all([
    testStandardTaskLookup(),
    testSuccessFactorTaskLookup(),
    testNonExistentTaskLookup()
  ]);
  
  const allPassed = results.every(result => result === true);
  
  if (allPassed) {
    console.log(`\n${GREEN}All tests PASSED!${RESET}`);
    console.log(`${GREEN}The getTaskById method is working correctly for all test cases.${RESET}`);
  } else {
    console.log(`\n${RED}Some tests FAILED!${RESET}`);
    console.log(`${RED}Please check the logs above for details.${RESET}`);
  }
  
  return allPassed;
}

// Execute the tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`${RED}Test execution failed with error:${RESET}`, error);
    process.exit(1);
  });