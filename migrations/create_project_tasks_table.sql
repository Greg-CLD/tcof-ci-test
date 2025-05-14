-- Create project_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
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
  task_type TEXT DEFAULT 'custom'
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS project_tasks_project_id_idx ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS project_tasks_factor_id_idx ON project_tasks(factor_id);
CREATE INDEX IF NOT EXISTS project_tasks_stage_idx ON project_tasks(stage);
CREATE INDEX IF NOT EXISTS project_tasks_status_idx ON project_tasks(status);