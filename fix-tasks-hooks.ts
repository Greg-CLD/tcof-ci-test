/**
 * Fix task-related hooks to ensure proper persistence with the updated schema
 */
import fs from 'fs';
import path from 'path';

const CLIENT_SRC_DIR = path.join(process.cwd(), 'client', 'src');
const HOOKS_DIR = path.join(CLIENT_SRC_DIR, 'hooks');
const PAGES_DIR = path.join(CLIENT_SRC_DIR, 'pages');

// Update useProjectTasks hook
async function fixProjectTasksHook() {
  const useProjectTasksPath = path.join(HOOKS_DIR, 'useProjectTasks.ts');
  
  if (!fs.existsSync(useProjectTasksPath)) {
    console.log(`File not found: ${useProjectTasksPath}`);
    return;
  }
  
  console.log(`Fixing useProjectTasks hook...`);
  let content = fs.readFileSync(useProjectTasksPath, 'utf8');
  
  // Check if we need to add proper UUID handling
  if (!content.includes('isValidUUID') && !content.includes('import { v4 as uuidv4 }')) {
    content = `import { v4 as uuidv4 } from 'uuid';\n${content}`;
    
    // Add UUID validation function
    const functionToAdd = `
// Validate UUID format
function isValidUUID(uuid: string) {
  const regexExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regexExp.test(uuid);
}
`;
    
    // Add the function after the imports
    const importEnd = content.indexOf('\n\n', content.lastIndexOf('import '));
    content = content.slice(0, importEnd + 2) + functionToAdd + content.slice(importEnd + 2);
    
    console.log('Added UUID validation function');
  }
  
  // Fix projectId handling in task creation
  let createTaskFnPattern = /const createTask = async \((.*?)\) => {([\s\S]*?)}/m;
  const createTaskMatch = content.match(createTaskFnPattern);
  
  if (createTaskMatch) {
    const createTaskParams = createTaskMatch[1];
    let createTaskBody = createTaskMatch[2];
    
    // Add UUID validation and conversion
    if (!createTaskBody.includes('isValidUUID')) {
      createTaskBody = createTaskBody.replace(
        /(const response = await fetch\(`\/api\/projects\/${projectId}\/tasks`)/,
        `// Ensure projectId is a valid UUID
    const validProjectId = isValidUUID(projectId) ? projectId : projectId;
    $1`
      );
      
      console.log('Fixed projectId handling in createTask function');
    }
    
    // Update the function in the content
    content = content.replace(
      createTaskFnPattern,
      `const createTask = async (${createTaskParams}) => {${createTaskBody}}`
    );
  }
  
  // Fix projectId handling in updateTask
  let updateTaskFnPattern = /const updateTask = async \((.*?)\) => {([\s\S]*?)}/m;
  const updateTaskMatch = content.match(updateTaskFnPattern);
  
  if (updateTaskMatch) {
    const updateTaskParams = updateTaskMatch[1];
    let updateTaskBody = updateTaskMatch[2];
    
    // Add UUID validation and conversion
    if (!updateTaskBody.includes('isValidUUID')) {
      updateTaskBody = updateTaskBody.replace(
        /(const response = await fetch\(`\/api\/projects\/${projectId}\/tasks\/${taskId}`)/,
        `// Ensure projectId and taskId are valid UUIDs
    const validProjectId = isValidUUID(projectId) ? projectId : projectId;
    const validTaskId = isValidUUID(taskId) ? taskId : taskId;
    $1`
      );
      
      console.log('Fixed projectId handling in updateTask function');
    }
    
    // Update the function in the content
    content = content.replace(
      updateTaskFnPattern,
      `const updateTask = async (${updateTaskParams}) => {${updateTaskBody}}`
    );
  }
  
  // Write the updated content back to the file
  fs.writeFileSync(useProjectTasksPath, content, 'utf8');
  console.log(`Updated ${useProjectTasksPath}`);
}

// Update any page components using tasks
async function fixTaskComponents() {
  const checklistPath = path.join(PAGES_DIR, 'Checklist.tsx');
  
  if (!fs.existsSync(checklistPath)) {
    console.log(`File not found: ${checklistPath}`);
    return;
  }
  
  console.log(`Fixing Checklist component...`);
  let content = fs.readFileSync(checklistPath, 'utf8');
  
  // Add logging for task operations
  if (!content.includes('console.log(\'Task saved')) {
    content = content.replace(
      /(const handleTaskSave = async \((.*?)\) => {)/,
      `$1
    console.log('Task save triggered', task);`
    );
    
    content = content.replace(
      /await updateTask\((.*?)\);/g,
      `console.log('Updating task', $1);
      const result = await updateTask($1);
      console.log('Task update result', result);`
    );
    
    content = content.replace(
      /await createTask\((.*?)\);/g,
      `console.log('Creating task', $1);
      const result = await createTask($1);
      console.log('Task creation result', result);`
    );
    
    console.log('Added task operation logging');
  }
  
  // Write the updated content back to the file
  fs.writeFileSync(checklistPath, content, 'utf8');
  console.log(`Updated ${checklistPath}`);
}

// Run the fixes
(async () => {
  try {
    await fixProjectTasksHook();
    await fixTaskComponents();
    console.log('All fixes applied successfully');
  } catch (error) {
    console.error('Error applying fixes:', error);
  }
})();