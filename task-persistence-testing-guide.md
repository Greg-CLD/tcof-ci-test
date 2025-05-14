# Task Persistence Testing Guide

This guide will help you test and verify that task persistence is working correctly in your project checklist.

## Background: What Was Fixed

1. **Database Schema Issue**: We fixed a mismatch between the `project_tasks` table schema and the rest of the database. The `project_id` column was an integer type but needed to be a UUID.

2. **Client-Side Improvements**: We enhanced the task handling code to properly work with UUIDs and added more detailed logging to help troubleshoot any issues.

3. **Error Handling**: We improved error handling throughout the task persistence flow.

## How to Test Task Persistence

### Method 1: Browser Console Testing Tools

We've added a set of utility functions you can use directly in your browser console to test various aspects of task persistence:

1. Open your application in a browser and navigate to the Project Checklist page for a specific project.
2. Open the browser developer tools (F12 or right-click -> Inspect)
3. Go to the Console tab
4. Run these commands (replace `your-project-id` with an actual project ID):

```javascript
// Check if tasks load correctly
window.testLoadTasks('your-project-id');

// Create a test task
window.testCreateTask('your-project-id');

// To update a specific task (replace task-id with actual ID)
window.testUpdateTask('your-project-id', 'task-id');

// Run a full lifecycle test (create, update, verify)
window.testTaskLifecycle('your-project-id');

// Analyze database structure
window.analyzeDatabase();
```

### Method 2: Manual Testing

Follow these steps to manually test task persistence:

1. Create a new project or open an existing one
2. Navigate to the Project Checklist page
3. Add a new task with a distinctive name
4. Save the task
5. Refresh the page completely (Ctrl+F5 or Cmd+Shift+R)
6. Verify that your task is still present
7. Edit the task, change its status or description
8. Save the changes
9. Refresh the page again
10. Verify that your changes persisted

## Common Issues and Solutions

If you encounter any issues, here are some troubleshooting steps:

### Tasks Don't Save
- Check the browser console for error messages
- Verify that you're logged in (authentication is required)
- Ensure the project ID is valid

### Tasks Disappear After Refresh
- This was likely caused by the fixed database schema issue
- Try creating a new task now that the schema has been fixed
- If issues persist, run the `window.analyzeDatabase()` function and share the output

### Server Errors
- Check the server logs for more detailed error messages
- Verify that the database connection is working correctly

## Schema Information

For reference, here's the current schema of the project_tasks table:

```sql
CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  factor_id TEXT,
  stage TEXT,
  status TEXT DEFAULT 'pending',
  due_date TIMESTAMP,
  assigned_to TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sort_order INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  task_notes TEXT,
  task_type TEXT DEFAULT 'custom',
  text TEXT,
  origin TEXT,
  source_id TEXT,
  notes TEXT,
  priority TEXT,
  owner TEXT
);
```

## Additional Commands (For Administrators)

If issues persist, administrators can run these backend commands:

```bash
# Fix project tasks schema
node fix-project-tasks-schema.cjs

# View database analysis
curl http://localhost:5000/__tcof/db-analysis
```