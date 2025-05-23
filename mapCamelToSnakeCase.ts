/**
 * Utility function to map camelCase properties to snake_case database columns
 * This is a crucial fix for the task persistence issue
 */
import { validateSourceId } from './server/projectsDb';
import { ProjectTask } from './server/projectsDb';

/**
 * Maps camelCase property names to snake_case database column names
 * 
 * @param data The task data with camelCase properties (from application code)
 * @returns An object with snake_case property names (for database columns)
 */
export function mapCamelToSnakeCase(data: Partial<ProjectTask>): Record<string, any> {
  const updateData: Record<string, any> = {};
  
  // Direct field mappings (no conversion needed)
  if (data.text !== undefined) updateData.text = data.text;
  if (data.stage !== undefined) updateData.stage = data.stage;
  if (data.origin !== undefined) updateData.origin = data.origin;
  if (data.notes !== undefined) updateData.notes = data.notes === '' ? null : data.notes;
  if (data.priority !== undefined) updateData.priority = data.priority === '' ? null : data.priority;
  if (data.owner !== undefined) updateData.owner = data.owner === '' ? null : data.owner;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
  
  // CamelCase to snake_case mappings
  if (data.sourceId !== undefined) updateData.source_id = validateSourceId(data.sourceId);
  if (data.projectId !== undefined) updateData.project_id = data.projectId;
  if (data.dueDate !== undefined) updateData.due_date = data.dueDate === '' ? null : data.dueDate;
  
  // Additional fields from expanded ProjectTask interface
  if (data.taskType !== undefined) updateData.task_type = data.taskType === '' ? null : data.taskType;
  if (data.factorId !== undefined) updateData.factor_id = data.factorId === '' ? null : data.factorId;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo === '' ? null : data.assignedTo;
  if (data.taskNotes !== undefined) updateData.task_notes = data.taskNotes === '' ? null : data.taskNotes;
  
  // Handle dates
  if (data.createdAt !== undefined) {
    updateData.created_at = typeof data.createdAt === 'string' ? 
      new Date(data.createdAt) : data.createdAt;
  }
  
  // Always update the updatedAt timestamp
  updateData.updated_at = new Date();
  
  return updateData;
}