# Success Factor Task Toggle Persistence Bug Fix

## Identified Regressions

We've investigated the Success Factor task persistence issues and identified two key regressions:

### 1. Project Boundary Enforcement Failure

**Root cause**: When a task is updated by the `PUT /api/projects/{projectId}/tasks/{taskId}` endpoint, the system fails to properly enforce project boundaries during task lookup, especially when looking up tasks by `sourceId`.

**Issue details**:
- Multiple projects have tasks with the same `sourceId` (which is expected for Success Factors)
- When looking up a task by `sourceId`, the system fails to restrict the search to the specified project
- This can cause:
  - Updates to one project's task affecting another project's task
  - 404 errors because tasks from other projects are found but can't be updated
  - 400 errors because the lookup returns inconsistent results

**Evidence**:
- SQL query confirms multiple projects contain tasks with the same `sourceId`:
  ```sql
  SELECT source_id, COUNT(DISTINCT project_id) as project_count
  FROM project_tasks
  WHERE origin = 'factor'
  GROUP BY source_id
  HAVING COUNT(DISTINCT project_id) > 1;
  ```
- The `TaskIdResolver` class doesn't properly enforce project boundaries in all lookup methods
- The `getTaskBySourceId` function in `projectsDb.ts` doesn't always filter by `projectId`

### 2. Duplicate Success Factor Tasks During Seeding

**Root cause**: The `cloneSuccessFactors.ts` function that seeds Success Factor tasks into a project has a flaw in how it checks for existing tasks.

**Issue details**:
- For some Success Factors, more than 3 tasks are created in the same project (should be exactly 3: identification, definition, delivery)
- SQL query confirms duplicates:
  ```sql
  SELECT source_id, COUNT(*) as count
  FROM project_tasks
  WHERE project_id = '4e76d11e-7c74-497a-82fb-7245e0c50812' AND origin = 'factor'
  GROUP BY source_id
  HAVING COUNT(*) > 3;
  ```
- Duplicate tasks with the same `sourceId` in the same project make task lookup ambiguous
- This contributes to the task toggle persistence failure

## Required Fixes

### 1. Fix TaskIdResolver to Enforce Project Boundaries

In `server/services/taskIdResolver.ts`:
- Ensure all task lookup methods consistently filter by both `id`/`sourceId` AND `projectId`
- Particularly the `resolveTaskId` and `findTaskBySourceId` methods must enforce project boundaries

```typescript
// Example fix (actual implementation may need more detail)
async findTaskBySourceId(sourceId: string, projectId: string): Promise<TaskRow | null> {
  // Enforce projectId in the lookup query
  return this.db.query.projectTasks.findFirst({
    where: and(
      eq(projectTasks.sourceId, sourceId),
      eq(projectTasks.projectId, projectId)  // Enforce project boundary
    )
  });
}
```

### 2. Fix Success Factor Task Seeding in cloneSuccessFactors.ts

In `server/cloneSuccessFactors.ts`:
- Fix the check for existing tasks to properly detect duplicates
- Ensure task existence check works correctly for each stage (identification, definition, delivery)
- Consider adding a database constraint to prevent duplicate `(sourceId, projectId, stage)` combinations

```typescript
// Example fix (actual implementation may need more detail)
// Check if task already exists for this factor in this stage
const existingTask = await db.query.projectTasks.findFirst({
  where: and(
    eq(projectTasks.projectId, projectId),
    eq(projectTasks.sourceId, factor.id),
    eq(projectTasks.stage, stage)
  )
});

if (existingTask) {
  console.log(`[SUCCESS_FACTOR_CLONE] Task already exists for Success Factor ${factor.id} in stage ${stage}`);
  continue; // Skip creating this task
}
```

## Testing After Fixes

After implementing these fixes, the following tests should pass:

1. A new project should contain exactly 3 tasks per Success Factor (one for each stage)
2. Toggling a task in Project A should not affect the same Success Factor task in Project B
3. The task toggle endpoint should correctly find and update the specific task for the given project

## Validation Query

To validate the fixes after implementation, run:

```sql
-- Should return no rows if seeding is fixed
SELECT source_id, COUNT(*) as count
FROM project_tasks
WHERE project_id = '[your_project_id]' AND origin = 'factor'
GROUP BY source_id
HAVING COUNT(*) > 3;
```