#!/bin/bash

# Simple test script to verify Success Factor task metadata preservation
# Tests the PUT /api/projects/:projectId/tasks/:taskId endpoint

# Test configuration
PROJECT_ID="bc55c1a2-0cdf-4108-aa9e-44b44baea3b8"
TASK_ID="2f565bf9-70c7-5c41-93e7-c6c4cde32312"
API_BASE="https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev"

echo "===== Success Factor Task Persistence Test ====="
echo

# Step 1: Get the current tasks to find our target task
echo "--- Step 1: Get current tasks ---"
TASKS_RESPONSE=$(curl -s -X GET "${API_BASE}/api/projects/${PROJECT_ID}/tasks" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Override: true")

# Check for specific task
echo "Looking for task with ID: $TASK_ID"
echo "Task Response sample: ${TASKS_RESPONSE:0:150}..."

# Step 2: Find the current completion state of our target task
echo
echo "--- Step 2: Parse current task state ---"
# Simple grep approach to extract completion state
CURRENT_STATE=$(echo $TASKS_RESPONSE | grep -o "\"completed\":true" || echo "\"completed\":false")
echo "Current completion state: $CURRENT_STATE"

# Determine new state
if [[ "$CURRENT_STATE" == *"true"* ]]; then
  NEW_STATE="false"
else
  NEW_STATE="true"
fi
echo "Target completion state: $NEW_STATE"

# Step 3: Toggle the task's completion state
echo
echo "--- Step 3: Update task ---"
UPDATE_RESPONSE=$(curl -s -X PUT "${API_BASE}/api/projects/${PROJECT_ID}/tasks/${TASK_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Override: true" \
  -d "{\"completed\":$NEW_STATE}")

echo "Update response: ${UPDATE_RESPONSE:0:150}..."

# Step 4: Verify task state after update
echo
echo "--- Step 4: Verify updated task ---"
UPDATED_TASKS=$(curl -s -X GET "${API_BASE}/api/projects/${PROJECT_ID}/tasks" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Override: true")

# Check for completion state
UPDATED_STATE=$(echo $UPDATED_TASKS | grep -o "\"completed\":$NEW_STATE")
echo "Updated completion state: $UPDATED_STATE"

# Verify origin and sourceId are preserved
ORIGIN_PRESERVED=$(echo $UPDATED_TASKS | grep -o "\"origin\":\"factor\"")
SOURCE_ID_PRESERVED=$(echo $UPDATED_TASKS | grep -o "\"sourceId\":\"$TASK_ID\"")

echo
echo "--- Results Summary ---"
echo "Completion State Changed: $(if [[ ! -z "$UPDATED_STATE" ]]; then echo "YES"; else echo "NO"; fi)"
echo "Origin Preserved: $(if [[ ! -z "$ORIGIN_PRESERVED" ]]; then echo "YES"; else echo "NO"; fi)"
echo "SourceId Preserved: $(if [[ ! -z "$SOURCE_ID_PRESERVED" ]]; then echo "YES"; else echo "NO"; fi)"

# Final verdict
if [[ ! -z "$UPDATED_STATE" && ! -z "$ORIGIN_PRESERVED" && ! -z "$SOURCE_ID_PRESERVED" ]]; then
  echo
  echo "✅ SUCCESS: Task persistence test passed! All metadata preserved."
else
  echo
  echo "❌ FAILURE: Task persistence test failed. See validation results above."
fi