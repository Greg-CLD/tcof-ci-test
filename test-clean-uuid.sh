#!/bin/bash
# Simple smoke test for clean UUID task lookups

echo "===== TESTING TASK LOOKUP WITH CLEAN UUID ====="

# Configuration
PROJECT_ID="bc55c1a2-0cdf-4108-aa9e-44b44baea3b8"
BASE_URL="http://localhost:5000"

# Step 1: Log in to get a session cookie
echo -e "\n🔑 Logging in..."
COOKIE=$(curl -s -c - -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "greg@confluity.co.uk", "password": "password1"}' | grep -oP 'connect\.sid\s+\K[^\s]+')

if [ -z "$COOKIE" ]; then
  echo "❌ Login failed - no cookie received"
  exit 1
fi

echo "✅ Login successful, got cookie"
COOKIE_HEADER="connect.sid=$COOKIE"

# Step 2: Get all tasks for the project
echo -e "\n📋 Fetching tasks for project $PROJECT_ID..."
TASKS_JSON=$(curl -s -b "$COOKIE_HEADER" "$BASE_URL/api/projects/$PROJECT_ID/tasks")

# Save tasks to a file for inspection
echo "$TASKS_JSON" > tasks-fetched.json
echo "✅ Saved tasks to tasks-fetched.json"

# Step 3: Extract a task ID to test with
# Find any task ID that has a hyphen
TASK_ID=$(echo "$TASKS_JSON" | grep -o -E '"id":"[a-f0-9\-]+"' | head -1 | cut -d'"' -f4)

if [ -z "$TASK_ID" ]; then
  echo "❌ No task IDs found in response"
  exit 1
fi

echo "✅ Found task ID: $TASK_ID"

# Step 4: Extract just the clean UUID (first 5 segments)
CLEAN_UUID=$(echo "$TASK_ID" | awk -F'-' '{print $1"-"$2"-"$3"-"$4"-"$5}')
echo "✅ Using clean UUID: $CLEAN_UUID"

# Step 5: Check if the task is currently completed
IS_COMPLETED=$(echo "$TASKS_JSON" | grep -o -E "\"id\":\"$TASK_ID\".+?\"completed\":(true|false)" | grep -o -E "(true|false)")
echo "✅ Current completion state: $IS_COMPLETED"

# Step 6: Toggle the completed state for the test
if [ "$IS_COMPLETED" == "true" ]; then
  NEW_STATE="false"
else
  NEW_STATE="true"
fi
echo "✅ Setting completion to: $NEW_STATE"

# Step 7: Update the task using the CLEAN UUID (not the full ID)
echo -e "\n🔄 Updating task using clean UUID..."
UPDATE_RESULT=$(curl -s -b "$COOKIE_HEADER" -X PUT "$BASE_URL/api/projects/$PROJECT_ID/tasks/$CLEAN_UUID" \
  -H "Content-Type: application/json" \
  -d "{\"completed\": $NEW_STATE}")

# Check if the update was successful (response contains the new state)
if echo "$UPDATE_RESULT" | grep -q "\"completed\":$NEW_STATE"; then
  echo "✅ SUCCESS: Task update with clean UUID worked!"
  echo -e "Response: $UPDATE_RESULT\n"
else
  echo "❌ FAILED: Task update with clean UUID failed."
  echo -e "Response: $UPDATE_RESULT\n"
  exit 1
fi

# Step 8: Verify the task was updated by fetching again
echo -e "\n🔍 Verifying task update..."
VERIFY_JSON=$(curl -s -b "$COOKIE_HEADER" "$BASE_URL/api/projects/$PROJECT_ID/tasks")

# Check if the task shows the new completion state
UPDATED_STATE=$(echo "$VERIFY_JSON" | grep -o -E "\"id\":\"$TASK_ID\".+?\"completed\":(true|false)" | grep -o -E "(true|false)")
echo "✅ Task completion state after update: $UPDATED_STATE"

if [ "$UPDATED_STATE" == "$NEW_STATE" ]; then
  echo "✅ VERIFICATION PASSED: Task update persisted correctly!"
else
  echo "❌ VERIFICATION FAILED: Task state did not update as expected."
  exit 1
fi

echo -e "\n===== TEST COMPLETED SUCCESSFULLY ====="