# Task Persistence Testing Guide

This guide explains how to verify the task persistence improvements that have been implemented, specifically the enhanced UUID matching functionality that allows tasks to be found by their clean UUID even when stored with compound IDs.

## Test Environment Setup

### 1. Create your test environment file

Copy the example configuration file to create your own test environment:

```bash
cp config/test.env.example config/test.env
```

Edit the `config/test.env` file to add your test credentials:

```
TEST_USERNAME=your_test_username
TEST_PASSWORD=your_test_password
TEST_PROJECT_ID=your_test_project_id
```

### 2. Run the smoke test to verify UUID matching

The most direct way to verify the UUID matching logic works is to run the smoke test:

```bash
node smoke-test-uuid-lookup.js
```

This will run a series of tests that verify:
- Tasks can be found by exact ID match
- Tasks can be found by clean UUID even with compound IDs
- Tasks can be found by partial UUID prefix
- Non-existent task IDs are properly handled

### 3. Run the integrated API test

For a full end-to-end verification including authentication, task creation, and task update:

```bash
node test-task-update.cjs
```

This script will:
1. Load credentials from your test environment file
2. Create a real test task in the database
3. Update it using only the clean UUID part
4. Verify the update was persisted correctly
5. Clean up the test task

## Understanding the UUID Matching Improvement

The core improvement is in how task lookups work. Previously, lookups required an exact match of the task ID. Now, there are three ways to find a task:

1. **Exact Match**: The complete task ID matches exactly
2. **Clean UUID Match**: The clean UUID part (without suffixes) matches 
3. **Prefix Match**: A partial ID prefix matches the beginning of the task ID

For tasks created by the success factor system, the task IDs often have a compound format like:
`abc12345-6789-0123-4567-89abcdef0123-success-factor-123`

With this improvement, you can now find such a task using just:
`abc12345-6789-0123-4567-89abcdef0123`

## Debugging Task Persistence Issues

If you encounter issues with task persistence:

1. Enable detailed logging by setting in your `config/test.env`:
   ```
   TEST_DEBUG_TASKS=true
   TEST_DEBUG_TASK_API=true
   TEST_DEBUG_TASK_PERSISTENCE=true
   ```

2. Use `node verify-task-uuid-matching.js` to directly test the database operations.

3. Check the database structure with `node check-task-schema.js`.

## Manual Testing

You can also verify the improvements manually through the UI:

1. Create a new task in the project checklist
2. Note the task ID from the network request
3. Check the completion box to toggle its state
4. Verify the task's state persists after page reload

## Advanced Scenarios

For more advanced testing scenarios:

### Testing Custom Tasks
Custom tasks can be created through the API and will behave the same way:

```bash
node test-sf-task-persistence.js
```

### Testing Database Directly
To bypass the API and test directly against the database:

```bash
node test-fixed-task-persistence.js
```

## Common Issues

- **Missing Credentials**: Ensure you've set up the `config/test.env` file correctly with valid credentials
- **Database Connection**: Verify your database connection is working properly
- **Project ID**: Make sure you're using a valid project ID that exists in your database

For any issues, check the console logs for detailed error messages.